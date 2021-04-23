const PaymentStream = artifacts.require("PaymentStream");

module.exports = function (deployer) {
  deployer.deploy(PaymentStream);
};
