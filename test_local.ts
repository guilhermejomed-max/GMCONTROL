import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('http://localhost:3000/api/sascar/vehicles', {
      plates: []
    });
    console.log("First vehicle:", JSON.stringify(res.data.data[0], null, 2));
  } catch (e) {
    console.error(e.message);
  }
}

test();
