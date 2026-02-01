import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { executeQuery } from '../config/database.js';
import axios from 'axios';


export const signup = async (req, res) => {
    const { email, password } = req.body;

    // 1. Basic validation
    if (!email || !password) {
        return res.status(400).json({ message: "Please provide email and password" });
    }

    try {
        // 2. Check if user already exists
        const userExists = await executeQuery('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rowCount > 0) {
            return res.status(409).json({ message: "User already registered" });
        }

        // 3. Hash password (The Bcrypt concept we discussed!)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Save to PostgreSQL
        const newUser = await executeQuery(
            'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
            [email, hashedPassword]
        );

        res.status(201).json({
            message: "User created successfully",
            user: newUser.rows[0]
        });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: "Server error during registration" });
    }
};


export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Find user by email
        const result = await executeQuery('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rowCount === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = result.rows[0];

        // 2. Compare passwords (Bcrypt does the "shredding" and matching here)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 3. Create the JWT "Membership Card"
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            message: "Login successful",
            token,
            user: { id: user.id, email: user.email }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error during login" });
    }
};

export const gitCallback = async (req, res) => {
    const { code } = req.query;

    if (!code) {
        console.error("GitHub callback: No code received");
        return res.status(400).json({ message: "No authorization code received" });
    }

    try {
        console.log("GitHub callback: Exchanging code for token...");
        const response = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
        }, {
            headers: { 'Accept': 'application/json' }
        });

        if (response.data.error) {
            console.error("GitHub token error:", response.data);
            return res.status(400).json({ message: response.data.error_description || "GitHub authorization failed" });
        }

        const accessToken = response.data.access_token;
        console.log("GitHub callback: Got access token, fetching user data...");

        const userData = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const { id, email, login, avatar_url } = userData.data;
        console.log("GitHub user:", { id, email, login, avatar_url });

        let userResult = await executeQuery('SELECT * FROM users WHERE github_id = $1', [id.toString()]);

        let user;
        if (userResult.rowCount === 0) {
            console.log("Creating new user for GitHub ID:", id);
            const result = await executeQuery(
                'INSERT INTO users (email, github_id, github_username) VALUES ($1, $2, $3) RETURNING id, email, github_username',
                [email || `${login}@github.local`, id.toString(), login]
            );
            user = result.rows[0];
        } else {
            user = userResult.rows[0];
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Include GitHub profile info in redirect URL
        const redirectParams = new URLSearchParams({
            token: token,
            username: login,
            avatar: avatar_url || '',
            email: email || `${login}@github.local`
        });

        console.log("GitHub callback: Success, redirecting with token and profile info");
        const FRONTEND_URL = 'https://talk-to-db.netlify.app/' || 'http://localhost:5173'
        res.redirect(`${FRONTEND_URL}/auth-success?${redirectParams.toString()}`);

    } catch (error) {
        console.error("GitHub Login Error:", error.response?.data || error.message || error);
        res.status(500).json({ message: "Server error during GitHub login" });
    }
}