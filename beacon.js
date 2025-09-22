// beacons.js — MeshSync Beacon Logger (Firebase v9 modular)
import { app, db, storage } from './firebaseConfig.js';
import {
  getFirestore, doc, setDoc, serverTimestamp, collection, addDoc, query, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const fs = getFirestore(app);
const st = getStorage(app);

// Helpers
const $ = (id) => document.getElementById(id);
const fmt = (v) => (v ?? '').toString().trim();
function genBeaconId() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const r = Math.floor(100 + Math.random()*900);
  return `MS-${y}${m}-${r}`;
}

// Save beacon
$('genIdBtn')?.addEventListener('click', ()=>{
  $('beaconId').value = genBeaconId();
});

$('saveBeaconBtn')?.addEventListener('click', async ()=>{
  const beaconId = fmt($('beaconId').value);
  const status = fmt($('beaconStatus').value);
  if (!beaconId) { $('bStatus').textContent = 'Beacon ID required.'; return; }
  const data = {
    beaconId,
    make: fmt($('make').value),
    model: fmt($('model').value),
    mac: fmt($('mac').value),
    serial: fmt($('mac').value),
    status,
    notes: fmt($('beaconNotes').value),
    createdAt: serverTimestamp()
  };
  try{
    await setDoc(doc(fs, 'beacons', beaconId), data, { merge: true });
    $('bStatus').innerHTML = '✅ Saved beacon.';
  }catch(e){
    $('bStatus').innerHTML = '❌ '+e.message;
  }
});

// Save placement
$('savePlacementBtn')?.addEventListener('click', async ()=>{
  const beaconId = fmt($('p_beaconId').value);
  if (!beaconId){ $('pStatus').textContent='Beacon ID required.'; return; }

  const file = $('proofPhoto').files[0];
  let photoURL = '';
  try{
    if (file){
      const uidPart = 'anon'; // replace with auth.uid once you gate the page
      const path = `beacons/${beaconId}/photos/${uidPart}/${Date.now()}-${file.name}`;
      const r = ref(st, path);
      await uploadBytes(r, file);
      photoURL = await getDownloadURL(r);
    }
  }catch(e){
    $('pStatus').textContent = 'Photo upload failed: '+e.message;
    return;
  }

  const payload = {
    beaconId,
    status: fmt($('p_status').value),
    hostName: fmt($('hostName').value),
    hostWallet: fmt($('hostWallet').value),
    incentiveType: fmt($('incentiveType').value),
    incentiveRate: fmt($('incentiveRate').value),
    latitude: Number(fmt($('lat').value)) || null,
    longitude: Number(fmt($('lng').value)) || null,
    address: fmt($('address').value),
    proofPhotoURL: photoURL,
    installedBy: 'field-ops', // replace with auth.uid/displayName later
    notes: fmt($('notes').value),
    placedAt: serverTimestamp()
  };

  try{
    await addDoc(collection(fs, 'beacons', beaconId, 'placements'), payload);
    $('pStatus').innerHTML = '✅ Saved placement.';
    $('proofPhoto').value = ''; // clear file input
    loadRecent();
  }catch(e){
    $('pStatus').innerHTML = '❌ '+e.message;
  }
});

// Load recent placements
async function loadRecent(){
  const tbody = document.querySelector('#placementsTable tbody');
  tbody.innerHTML = '<tr><td colspan="8" class="mini">Loading…</td></tr>';
  const q = query(collection(fs, 'beacons'), orderBy('beaconId'), limit(200));
  const beaconSnaps = await getDocs(q);

  // For brevity, fetch last placement per beacon (could paginate later)
  tbody.innerHTML = '';
  for (const b of beaconSnaps.docs){
    const bid = b.id;
    const pq = query(collection(fs, 'beacons', bid, 'placements'), orderBy('placedAt','desc'), limit(1));
    const ps = await getDocs(pq);
    if (ps.empty){
      tbody.insertAdjacentHTML('beforeend', `<tr><td>${bid}</td><td colspan="7" class="mini">No placements yet</td></tr>`);
      continue;
    }
    const p = ps.docs[0].data();
    const photoLink = p.proofPhotoURL ? `<a href="http://${p.proofPhotoURL}" target="_blank">view</a>` : '';
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${bid}</td>
        <td>${p.hostName || ''}</td>
        <td>${p.incentiveType || ''} ${p.incentiveRate || ''}</td>
        <td>${p.status || ''}</td>
        <td>${p.latitude ?? ''}</td>
        <td>${p.longitude ?? ''}</td>
        <td>${photoLink}</td>
        <td>${p.placedAt?.toDate ? p.placedAt.toDate().toLocaleString() : ''}</td>
      </tr>
    `);
  }
}
$('refreshBtn')?.addEventListener('click', loadRecent);
document.addEventListener('DOMContentLoaded', loadRecent);

// Export CSV
$('exportCsvBtn')?.addEventListener('click', async ()=>{
  // Flatten latest placement per beacon to CSV
  const lines = [['BeaconID','Host','IncentiveType','IncentiveRate','Status','Latitude','Longitude','Address','PhotoURL','PlacedAt']];
  const q = query(collection(fs, 'beacons'), orderBy('beaconId'), limit(1000));
  const beaconSnaps = await getDocs(q);
  for (const b of beaconSnaps.docs){
    const bid = b.id;
    const pq = query(collection(fs, 'beacons', bid, 'placements'), orderBy('placedAt','desc'), limit(1));
    const ps = await getDocs(pq);
    if (ps.empty){ continue; }
    const p = ps.docs[0].data();
    lines.push([
      bid,
      p.hostName||'',
      p.incentiveType||'',
      (p.incentiveRate||'').toString().replace(/,/g,';'),
      p.status||'',
      p.latitude??'',
      p.longitude??'',
      (p.address||'').toString().replace(/,/g,';'),
      p.proofPhotoURL||'',
      p.placedAt?.toDate ? p.placedAt.toDate().toISOString() : ''
    ]);
  }
  const csv = lines.map(r=>r.map(v=>`"${(v??'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'meshsync_beacon_placements.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});
