import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('http://localhost:3000/api/sascar/debug');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error(e.message);
  }
}

test();
