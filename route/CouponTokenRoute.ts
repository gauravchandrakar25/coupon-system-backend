const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const ipfsController = require("../controllers/CouponToken");

router.post("/mint-coupon", upload.single("image"), ipfsController.ImageToIPFS);

module.exports = router;
