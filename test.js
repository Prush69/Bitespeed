async function runTests() {
  const baseUrl = 'http://localhost:3000/api/identify';
  
  async function identify(payload) {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log(`Payload: ${JSON.stringify(payload)}`);
    console.log(`Response: ${JSON.stringify(data, null, 2)}\n`);
    return data;
  }

  // Wait for server to be ready
  console.log("Waiting for server to start...");
  for (let i = 0; i < 10; i++) {
    try {
      await fetch('http://localhost:3000/');
      break;
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const timestamp = Date.now();
  const email1 = `lorraine_${timestamp}@hillvalley.edu`;
  const phone1 = `123456_${timestamp}`;
  const phone2 = `654321_${timestamp}`;
  const email2 = `docbrown_${timestamp}@1985.com`;
  const phone3 = `999999_${timestamp}`;

  console.log("--- TEST 1: Create new primary contact ---");
  await identify({ email: email1, phoneNumber: phone1 });

  console.log("--- TEST 2: Add secondary contact (new phone, same email) ---");
  await identify({ email: email1, phoneNumber: phone2 });

  console.log("--- TEST 3: Create another primary contact ---");
  await identify({ email: email2, phoneNumber: phone3 });

  console.log("--- TEST 4: Merge the two primary contacts ---");
  await identify({ email: email2, phoneNumber: phone1 });
}
runTests().catch(console.error);
