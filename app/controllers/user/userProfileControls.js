const User = require('../../models/userModel');
const getUser = require('../../helpers/getUser');
const httpStatus = require('../../utils/httpStatus');
const { hashPassword, verifyPassword } = require('../../services/authService');
const { createOtp } = require('../../services/otpService');
const { generateUpdatedEmailOtp } = require('../../utils/emailTemplates');
const { sendEmail } = require('../../services/emailService');
const Address = require('../../models/addressModel');


const profileControls = {
    updateProfileImage: async (req, res, next) => {
        try {
            if (!req.file) {
                return res.status(httpStatus.BAD_REQUEST).json({ message: 'No file uploaded' });
            }
            const user = await getUser(req, res, next);
            const userId = user._id;

            const profileImagePath = `/uploads/profile-images/${req.file.filename}`;

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { profile_image: profileImagePath },
                { new: true }
            );

            if (!updatedUser) {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'User not found' });
            }
            res.status(httpStatus.OK).json({ profile_image_url: profileImagePath });
        } catch (err) {
            next(err);
        }
    },


    updateUserInfo: async (req, res, next) => {
        try {
            const { first_name, last_name, mobile } = req.body;
            const user = await getUser(req, res, next);
            const userId = user._id;

            if (!first_name || !last_name || !mobile) {
                return res.status(httpStatus.BAD_REQUEST).json({ message: "No changes made" })
            }

            const updatedUser = await User.findByIdAndUpdate(
                userId, {
                first_name: first_name,
                last_name: last_name,
                mobile: mobile
            });
            if (!updatedUser) {
                return res.status(httpStatus.NOT_FOUND)
                    .json({ message: "Something went wrong!" });
            }
            res.status(httpStatus.OK).json({ message: "Changes saved" });
        } catch (err) {
            next(err);
        }
    },

    updatePassword: async (req, res, next) => {
        try {
            const { current_password, new_password, confirm_password } = req.body;
            const user = await getUser(req, res, next);
            const userId = user._id;

            if (new_password !== confirm_password) {
                return res.status(httpStatus.BAD_REQUEST).json({ message: "Password are not matching!" })
            }
            const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
            if (!strongPasswordRegex.test(new_password)) {
                return res
                    .status(httpStatus.BAD_REQUEST)
                    .json({ message: "New password does not meet strength requirements!" });
            }

            const hashedPassword = await hashPassword(new_password);

            if (!current_password) {
                console.log(hashedPassword);
                const updatedUser = await User.findByIdAndUpdate(userId, { password: hashedPassword });
                if (!updatedUser) {
                    return res.status(httpStatus.NOT_FOUND).json({ message: "Something went wrong" })
                }
                return res.status(httpStatus.OK).json({ message: "Password added successfully" });
            }
            const isOldPassword = await verifyPassword(new_password, user.password);
            if (!isOldPassword) {
                return res
                    .status(httpStatus.BAD_REQUEST)
                    .json({ message: "New password should not match the old password" });
            }

            const isCurrentPassword = await verifyPassword(current_password, user.password);
            if (!isCurrentPassword) {
                return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid Current Password!" })
            }

            const updatedUser = await User.findByIdAndUpdate(userId, { password: hashedPassword });
            if (!updatedUser) {
                return res.status(httpStatus.NOT_FOUND).json({ message: "Something went wrong" })
            }
            res.status(httpStatus.OK).json({ message: "Password updated successfully" });

        } catch (err) {
            next(err);
        }
    },

    sendOtp: async (req, res, next) => {
        try {
            const { current_password, new_email, confirm_email } = req.body;

            const user = await getUser(req, res, next);
            const userId = user._id;

            const isVerified = await verifyPassword(current_password, user.password);
            if (!isVerified) {
                return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid Password" });
            }

            if (new_email != confirm_email) {
                console.log(new_email, confirm_email);

                return res.status(httpStatus.BAD_REQUEST).json({ message: "Emails does not match!" })
            }

            const { otp, otpExpires } = await createOtp()
            console.log('OTP is: ', otp);
            const attatchOtpToUser = await User.findByIdAndUpdate(userId, { otp: otp, otpExpires: otpExpires });

            if (!attatchOtpToUser) {
                return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Somthing went wrong" });
            }
            const emailContent = generateUpdatedEmailOtp(user.first_name, otp);

            await sendEmail(
                new_email,
                emailContent.subject,
                emailContent.text,
                emailContent.html
            );
            res.status(httpStatus.OK).json({ message: "OTP send to your email!" })
        } catch (err) {
            next(err)
        }
    },

    resendOtp: async (req, res, next) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: "Something went wrong!" })
            }

            const user = await getUser(req, res, next);
            const userId = user._id;

            const { otp, otpExpires } = await createOtp();
            console.log('OTP is: ', otp);
            const attatchOtpToUser = await User.findByIdAndUpdate(userId, { otp: otp, otpExpires: otpExpires });

            if (!attatchOtpToUser) {
                return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Somthing went wrong" });
            }
            const emailContent = generateUpdatedEmailOtp(user.first_name, otp);
            await sendEmail(
                email,
                emailContent.subject,
                emailContent.text,
                emailContent.html
            );
            res.status(httpStatus.OK).json({ message: "OTP send to your email!" })
        } catch (err) {
            next(err);
        }
    },
    verifyAndUpdateEmail: async (req, res, next) => {
        try {
            const { new_email, otp } = req.body;

            if (!new_email) {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: "Something went wrong!" })
            }

            const user = await getUser(req, res, next);
            const userId = user._id;

            if (!user || user.otp !== otp || user.otpExpires < new Date()) {
                return res
                    .status(httpStatus.BAD_GATEWAY)
                    .json({ message: "Invalid OTP !" });
            }

            const updatedUser = await User.findByIdAndUpdate(userId, { email: new_email, otp: null, otpExpires: null });
            if (!updatedUser) {
                return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong!" })
            }

            res.status(httpStatus.OK).json({ message: "Email Updated Successfully" })

        } catch (err) {
            next(err);
        }
    },

    addAddress: async (req, res, next) => {
        try {
            const {
                name,
                email,
                contact_number,
                alternate_number,
                country,
                state,
                address,
                pincode,
                landmark,
                address_type,
            } = req.body;

            if (!name || !email || !contact_number || !country || !state || !address || !pincode || !address_type) {
                return res.status(httpStatus.BAD_REQUEST).json({
                    message: "Missing required fields. Please provide name, email, contact number, country, state, address, pincode, and address type.",
                });
            }
            const user = await getUser(req, res, next);

            // Create a new address document
            const newAddress = new Address({
                user,
                full_name: name,
                email,
                contact_number,
                alternate_number: alternate_number || null,
                country,
                state,
                address,
                pincode,
                landmark: landmark || null,
                address_type,
            });


            const savedAddress = await newAddress.save();

            return res.status(httpStatus.OK).json({
                success: true,
                message: "Address added successfully!",
                address: savedAddress,
            });
        } catch (err) {
            console.error("Error adding address:", err);

            // If the error is a validation error from the database (e.g., from Mongoose)
            if (err.name === "ValidationError") {
                return res.status(httpStatus.BAD_REQUEST).json({
                    message: "Validation Error",
                    details: err.errors,
                });
            }
            next(err);
        }
    },
    updateAddress: async (req, res, next) => {
        try {
            const {
                name,
                email,
                contact_number,
                alternate_number,
                country,
                state,
                address,
                pincode,
                landmark,
                address_type,
                id } = req.body;

            if (!id) {
                return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong" });
            }
            if (!name || !email || !contact_number || !country || !state || !address || !pincode || !address_type) {
                return res.status(httpStatus.BAD_REQUEST).json({
                    message: "Missing required fields. Please provide name, email, contact number, country, state, address, pincode, and address type.",
                });
            }
            const isUpdated = await Address.findByIdAndUpdate(id, {
                full_name: name,
                email: email,
                contact_number: contact_number,
                alternate_number: alternate_number || null,
                country: country,
                state: state,
                address: address,
                pincode: pincode,
                landmark: landmark || null,
                address_type: address_type
            })
            if (!isUpdated) {
                return res.status(httpStatus.INTERNAL_SERVER_ERROR)
                    .json({ success: false, message: "Some thing went worng. Please try again later!" })
            }
            res.status(httpStatus.OK).json({ success: true, message: "Address Edited Successfully" })

        } catch (err) {
            next(err);
        }
    },

    deleteAddress: async (req, res, next) => {
        try {
            const { addressId } = req.body;
            const isDeleted = await Address.findByIdAndDelete(addressId);
            if (!isDeleted) {
                return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Something went wrong!" });
            }
            res.status(httpStatus.OK).json({ success: true, message: "Address deleted successfully" })
        } catch (err) {
            next(err);
        }
    }

}
module.exports = profileControls;
