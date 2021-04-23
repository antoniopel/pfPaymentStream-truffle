// helper function to move time forward in ganache using web3.js

module.exports = (web3) => {

    return function increaseTime(seconds) {
    
        return new Promise((resolve,reject) => {
    
            web3.currentProvider.send({
    
                jsonrpc: '2.0', 
                method: 'evm_increaseTime', 
                params: [seconds], 
                id: new Date().getSeconds()
    
            }, (err) => {
                if (err) reject(err);
    
                    web3.currentProvider.send({
                        jsonrpc: '2.0', 
                        method: 'evm_mine', 
                        params: [], 
                        id: new Date().getSeconds()
                    }, (err) => {
                        if (err) reject(err);
                        resolve(true);
                    });
    
            });
            
        });
    }

};