async function test() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@universe.com', password: 'SuperAdmin@123' })
  });
  const loginData = await loginRes.json();
  const analyticsRes = await fetch('http://localhost:5000/api/super-admin/realtime-analytics', {
    headers: { Authorization: 'Bearer ' + loginData.token }
  });
  const analytics = await analyticsRes.json();
  console.log('DailyVelocity7Days (Last 7 Days):');
  analytics.dailyVelocity7Days.forEach(d => console.log('  ', d.date, '| Orders:', d.orders, '| Revenue: ₹' + d.revenue));
  console.log('AllTimeVelocity:');
  analytics.allTimeVelocity.forEach(a => console.log('  ', a.timeLabel, '| Orders:', a.orders, '| Revenue: ₹' + a.revenue));
}
test();
