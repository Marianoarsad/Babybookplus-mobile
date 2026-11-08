const HOSTED_API = 'https://babybook-xi2w.onrender.com';
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || HOSTED_API).replace(/\/$/, '');
module.exports = {API_BASE_URL, HOSTED_API};
