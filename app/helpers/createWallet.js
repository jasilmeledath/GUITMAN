const Wallet = require('../models/walletModel');

const createWallet = async (req, res, next) => {
    try {
      const userId = req.user._id
      if (!userId) {
        throw new Error("User not found!");
      }
      const wallet = new Wallet({ user: userId });
      await wallet.save();
      return wallet; 
    } catch (err) {
      next(err);
    }
  };
  module.exports = createWallet;
  