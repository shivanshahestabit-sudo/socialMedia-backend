const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleToken = async (req, res, next) => {
  try {
    let idToken, accessToken;
    
    if (req.body.credential && typeof req.body.credential === 'object') {
      idToken = req.body.credential.idToken;
      accessToken = req.body.credential.accessToken;
    } else if (req.body.credential && typeof req.body.credential === 'string') {
      idToken = req.body.credential;
      accessToken = req.body.access_token;
    } else {
      return res.status(400).json({ 
        success: false, 
        msg: 'Google credential is required' 
      });
    }

    console.log("Processing Google ID Token:", idToken ? 'Present' : 'Missing');
    console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID);
    
    if (!idToken) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Google ID token is required' 
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    if (!payload) {
      return res.status(401).json({ 
        success: false, 
        msg: 'Invalid Google token' 
      });
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return res.status(401).json({ 
        success: false, 
        msg: 'Token has expired' 
      });
    }

    const googleUser = {
      googleId: payload.sub,
      email: payload.email,
      firstName: payload.given_name || payload.name?.split(' ')[0] || '',
      lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
      picturePath: payload.picture,
      emailVerified: payload.email_verified,
      accessToken: accessToken || null
    };

    console.log("Google user verified:", googleUser.email);

    req.googleUser = googleUser;

    next();
  } catch (error) {
    console.error('Google token verification failed:', error);
    
    if (error.message.includes('audience')) {
      return res.status(401).json({ 
        success: false, 
        msg: 'Google Client ID mismatch. Please check your configuration.' 
      });
    } else if (error.message.includes('expired')) {
      return res.status(401).json({ 
        success: false, 
        msg: 'Google token has expired' 
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        msg: 'Google token verification failed' 
      });
    }
  }
};

module.exports = { verifyGoogleToken };