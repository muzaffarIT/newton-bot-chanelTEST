const axios = require('axios');
async function test() {
  try {
    const login = await axios.post('http://localhost:3000/api/auth/login', {email:'admin@newton.uz',password:'ChangeMe@2024!'});
    console.log('Login OK');
    const token = login.data.accessToken;
    
    const stats = await axios.get('http://localhost:3000/api/admin/dashboard/stats', {headers:{Authorization:`Bearer ${token}`}});
    console.log('Stats OK', stats.data);
  } catch(e) {
    console.log('Error', e.response?.data || e.message);
  }
}
test();
