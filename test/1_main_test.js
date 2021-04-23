
const WETH = artifacts.require("FakeERC20"); // Let's pretend it's the real WETH
const PaymentStream = artifacts.require("PaymentStream");
const truffleAssert = require('truffle-assertions');

const { soliditySha3 } = require("web3-utils");
const increaseTime = require("../utils/increase-time")(web3);

contract("PaymentStream", accounts => {

    let wETH;
    let paymentStream;
    const usdAmount = web3.utils.toWei("100000"); // 100k$ with 18 decimals

    before(async () => {
    
        // no need to deploy a test token in migrations
        
        wETH = await WETH.new(
                web3.utils.toWei("1000000") // initialSupply
        ); 

        paymentStream = await PaymentStream.deployed();

    
    });


    it("Missing oracle should throw an exception", async () => {

        await truffleAssert.fails(
            paymentStream.addToken(wETH.address, "0x0000000000000000000000000000000000000000"),
            truffleAssert.ErrorType.REVERT,
            "Oracle address missing"
        );

    });

    it("Adds support for fake WETH", async () => {

        const oracleAddress = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" // ETH/USD Chainlink oracle

        let result = await paymentStream.addToken(wETH.address, oracleAddress);
        
        truffleAssert.eventEmitted(result, 'tokenAdded', { tokenAddress: wETH.address, oracleAddress });
        
    });

    it("Should create first stream and expect stream id: 0", async function() {

        const [ fundingAddress, payee ] = accounts;

        // to keep things simple fundingAddress will be == payer for testing purposes
    
        const payer = fundingAddress;

        let blockInfo = await web3.eth.getBlock("latest");

        let result = await paymentStream.createStream(
                        payee, 
                        usdAmount,
                        wETH.address, 
                        fundingAddress, 
                        blockInfo.timestamp + (86400 * 365) // 1 year
        );

        truffleAssert.eventEmitted(result, 'newStream', { id: web3.utils.toBN(0), payer: payer, payee: payee });

        let role = soliditySha3(0); // role hash for streamId: 0

        truffleAssert.eventEmitted(result, 'RoleGranted', { role , account: payer });

    });

    it("Should get stream 0", async function () {

        let stream = await paymentStream.getStream(0);
    
        const [ fundingAddress, payee ] = accounts;
    
        assert.equal(stream.fundingAddress,fundingAddress);
        assert.equal(stream.payee,payee);
        
      });
    
    it("Should get streams count and be 1", async function () {

        let streamsCount = await paymentStream.getStreamsCount();

        assert.equal(streamsCount.toNumber(),1);
    });

    it("Should return the correct claimable amount", async function () {

        await increaseTime(86410); // one day and a few secs

        let claimable = await paymentStream.claimable(0);
        
        let afterOneDay = web3.utils.toBN(usdAmount).divn(365);
    
        assert.equal(claimable.gte(afterOneDay),true);

    });

    it("Payee claims his first check", async function () {

        const [ fundingAddress , payee ] = accounts;

        // infinite approval for paymentStream

        let tx = await wETH.approve(
            paymentStream.address, 
            web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1)),
            {
                from: fundingAddress
            }
        );
    
        let initialBalance = await wETH.balanceOf(payee);
    
        let result = await paymentStream.claim(0, { from: payee });

        truffleAssert.eventEmitted(result, 'claimed', { id: web3.utils.toBN(0) });

        let afterBalance = await wETH.balanceOf(payee);
    
        assert.equal(afterBalance.gt(initialBalance),true)
    
    });  

    it("Random person shouldn't be able to pause the stream", async function () {

        const [ , , , randomPerson ] = accounts;
    
        await truffleAssert.fails(
            paymentStream.pauseStream(0, { from: randomPerson }),
            truffleAssert.ErrorType.REVERT,
            "Not stream owner"
        );
    
    });

    it("Payer delegates 'thirdGuy' to pause/unpause stream and checks for paused = true", async function () {

        const [ , , thirdGuy, randomPerson ] = accounts;
    
        await paymentStream.delegatePausable(0, thirdGuy);
    
        await paymentStream.pauseStream(0, { from: thirdGuy });
    
        let streamInfo = await paymentStream.getStream(0);
    
        assert.equal(streamInfo.paused,true);
    
    });

    it("Can't claim on paused stream", async function () {

        const [ , payee ] = accounts;
    
        await truffleAssert.fails(
            paymentStream.claim(0, { from: payee }),
            truffleAssert.ErrorType.REVERT,
            "Stream is paused"
        );
    
    });  

});
