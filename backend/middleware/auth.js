import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || '4e457cd42a35e06819639dfdf690f6e0bca269908a2482b8f93badde0b5e93e0162bdfaec4bf3f35b5072f202a46cde06417cec5398a61249cbfb3161477427c'

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }
    req.user = user
    next()
  })
}

export const requireEmailVerification = (req, res, next) => {
  if (!req.user.emailVerified) {
    return res.status(403).json({ 
      error: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED'
    })
  }
  next()
}

export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      username: user.username,
      isAdmin: user.isAdmin || false,
      emailVerified: user.emailVerified || false
    }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  )
} 