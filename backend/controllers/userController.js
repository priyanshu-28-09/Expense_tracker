import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import JWT_SECRET from "../config/security.js";
const TOKEN_EXPIRES = "24h";

// Create JWT Token
const createToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
};

// REGISTER USER
export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  // Check empty fields
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  // Validate email
  if (!validator.isEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email",
    });
  }

  // Validate password length
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters",
    });
  }

  try {
    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(409).json({
        success: false,
        message: "User already present",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // Create token
    const token = createToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

//to login a user 
export async function loginUser(req,res){
    const{email, password} = req.body;
    if(!email || !password){
        return res.status(400).json({
            success: false,
            message: "both fields are required"
        });
    }

     try{
        const user = await User.findOne({email});
        if(!user){
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }
        const match = await bcrypt.compare(password, user.password);
        if(!match){
             return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }
        const token = createToken(user._id);
        res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
     }
     catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
      
     }
}

// to get login user details

export async function getCurrentUser(req, res){
  try{
    const user = await User.findById(req.user.id).select("name email");
    if(!user){
      return res.status(400).json({
        success : false,
        message : "User not found"
      });
    }
    res.json({success: true, user});
  }
  catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
}

// to update a user profile
export async function updateProfile(req,res){
  const { name, email} = req.body;
  if(!name || !email || !validator.isEmail(email)){
    return res.status(400).json({
      success: false,
      message : " valid email and name are required."
    });
  }
  try {
    const exists = await User.findOne({email, _id : {$ne: req.user.id}});
    if(exists){
      return res.status(400).json({
        success : false,
        message: " Email already in use."
      });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {name, email},
      {new: true, runValidators: true, select:"name email"}
    );
    res.json({
      success: true,
      user
    })
  } 
    catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
}

 //to change user password
  export async function updatePassword(req, res){
    const{ currentPassword, newPassword} = req.body;
    if(!currentPassword || !newPassword|| newPassword.length < 8){
      return res.status(400).json({
        success: false,
        message: "Password invalid or to short."
      });
    }
    try {
      const user = await User.findById(req.user.id).select("password");
      if(!user){
        return res.status(404).json({
          success: false,
          message:" User not faund."
        });
      }
      const match = await bcrypt.compare(currentPassword,user.password);
      if(!match){
        return res.status(401).json({
          success : false,
          message : "Current Password is incorrect."
        });
      }
      user.password = await    bcrypt.hash(newPassword, 10);
      await user.save();
      res.json({
        success: true,
        message: " Password change"
      });
      
    }
     catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
}