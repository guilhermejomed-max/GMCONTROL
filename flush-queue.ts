import axios from 'axios';

async function run() {
  try {
    console.log("Iniciando flush...");
    const res = await axios.get('http://localhost:3000/api/sascar/flush');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e: any) {
    console.error(e.message);
  }
}

run();