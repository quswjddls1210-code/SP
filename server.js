import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const folder = path.dirname(fileURLToPath(import.meta.url));
const dataFolder = path.join(folder, '.data');
mkdirSync(dataFolder, { recursive: true });
const secretFile = path.join(dataFolder, 'jwt-secret');
if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(32).toString('hex'));
const secret = process.env.JWT_SECRET || readFileSync(secretFile, 'utf8');
const db = new DatabaseSync(path.join(dataFolder, 'users.sqlite'));
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nickname TEXT NOT NULL
)`);

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.post('/api/signup', (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';
  const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ field: 'email', message: '이메일 형식이 맞지 않습니다.' });
  }
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ field: 'password', message: '비밀번호는 영문·숫자 포함 8자 이상이어야 합니다.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ field: 'confirmPassword', message: '비밀번호가 일치하지 않습니다.' });
  }
  if (nickname.length < 2 || nickname.length > 10) {
    return res.status(400).json({ field: 'nickname', message: '닉네임은 2~10자로 입력해 주세요.' });
  }

  const salt = randomBytes(16).toString('hex');
  const hash = salt + ':' + scryptSync(password, salt, 64).toString('hex');
  try {
    db.prepare('INSERT INTO users (email, password, nickname) VALUES (?, ?, ?)').run(email, hash, nickname);
  } catch (error) {
    if (error.code === 'ERR_SQLITE_ERROR' && error.errcode === 2067) {
      return res.status(409).json({ field: 'email', message: '이미 가입된 이메일입니다.' });
    }
    throw error;
  }
  res.status(201).json({ message: '회원가입이 완료되었습니다.' });
});

app.post('/api/login', (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ field: 'email', message: '이메일 형식이 맞지 않습니다.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ field: 'email', message: '가입된 이메일이 아닙니다.' });
  const [salt, hash] = user.password.split(':');
  if (!timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, 'hex'))) {
    return res.status(401).json({ field: 'password', message: '비밀번호가 맞지 않습니다.' });
  }

  const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '7d', algorithm: 'HS256' });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  res.json({ id: user.id, email: user.email, nickname: user.nickname });
});

app.get('/api/me', (req, res) => {
  try {
    const payload = jwt.verify(req.cookies.token, secret, { algorithms: ['HS256'] });
    const user = db.prepare('SELECT id, email, nickname FROM users WHERE id = ?').get(payload.userId);
    if (!user) return res.sendStatus(401);
    res.json(user);
  } catch {
    res.sendStatus(401);
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token', { path: '/', httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.sendStatus(204);
});

app.use('/api', (req, res) => res.status(404).json({ message: '요청한 주소를 찾을 수 없습니다.' }));
app.use(express.static(path.join(folder, 'dist')));
app.use((error, req, res, next) => {
  console.error(error.message);
  res.status(500).json({ message: '요청을 처리하지 못했습니다. 다시 시도해 주세요.' });
});

app.listen(3001, '127.0.0.1', () => console.log('서버 실행: http://127.0.0.1:3001'));
