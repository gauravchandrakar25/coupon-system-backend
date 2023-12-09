const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const ipfsController = require("../controllers/CouponToken");
const couponTokenMetadata = require("../controllers/CouponDetails");

router.post("/mint-coupon", upload.single("image"), ipfsController.ImageToIPFS);
router.post("/get-coupon-details", couponTokenMetadata.couponTokenDetails);

module.exports = router;
