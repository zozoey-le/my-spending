
/* ══ FIREBASE INITIALIZATION ══ */
const firebaseConfig = {
  apiKey: "AIzaSyBF3xvwAriONTwAp4_NfWlpeh3os1WsbsQ",
  authDomain: "my-spending-8111f.firebaseapp.com",
  projectId: "my-spending-8111f",
  storageBucket: "my-spending-8111f.firebasestorage.app",
  messagingSenderId: "419116501873",
  appId: "1:419116501873:web:0acd3b86a80499c94c04d0",
  measurementId: "G-5HHF283PB8"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* ══ GLOBAL STATE ══ */
const CATS={
  expense:['🍜 Food','🛵 Transport','🛍️ Shopping','💊 Health','📚 Education','🎮 Entertainment','💑 Wifey','🏠 Home Renting','📦 Other'],
  income:['💼 Salary','💸 Bonus','🎁 Gift','📈 Investment','📦 Other'],
  savings:['🐷 Monthly Savings','🏦 Emergency Fund','🌴 Travel Fund','📦 Other']
};
const MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

let txType='expense',filterType='all',searchQ='',confirmCb=null;
let barChart=null,pieChart=null,yearChart=null;
let summaryView='year';
let currentUser=null;
let txArr=[];
let budgets={};
const now=new Date();

/* ══ UTILITY FUNCTIONS ══ */
function todayStr(){return now.toISOString().split('T')[0]}
function fmtMoney(n){return new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(n||0)}
function fmtDate(s){const d=new Date(s+'T12:00:00');return DAY_NAMES[d.getDay()]+', '+MONTH_NAMES[d.getMonth()]+' '+d.getDate()}
function getYM(s){const d=new Date(s+'T12:00:00');return{y:d.getFullYear(),m:d.getMonth(),w:Math.min(3,Math.floor((d.getDate()-1)/7))}}

/* ══ AUTHENTICATION ══ */
function openSignupModal(){
  document.getElementById('signup-modal').classList.add('active');
  document.getElementById('signup-email').value='';
  document.getElementById('signup-password').value='';
  document.getElementById('signup-error').textContent='';
}

function closeSignupModal(){
  document.getElementById('signup-modal').classList.remove('active');
}

function openLoginModal(){
  document.getElementById('login-modal').classList.add('active');
  document.getElementById('login-email').value='';
  document.getElementById('login-password').value='';
  document.getElementById('login-error').textContent='';
}

function closeLoginModal(){
  document.getElementById('login-modal').classList.remove('active');
}

function handleSignup(){
  const email=document.getElementById('signup-email').value.trim();
  const password=document.getElementById('signup-password').value;
  const errorEl=document.getElementById('signup-error');
  
  if(!email||!password){
    errorEl.textContent='Please fill in all fields';
    return;
  }
  
  auth.createUserWithEmailAndPassword(email,password)
    .then(userCredential=>{
      showToast('Welcome! Account created ♡');
      closeSignupModal();
      spawnConfetti();
    })
    .catch(error=>{
      errorEl.textContent=error.message;
    });
}

function handleLogin(){
  const email=document.getElementById('login-email').value.trim();
  const password=document.getElementById('login-password').value;
  const errorEl=document.getElementById('login-error');
  
  if(!email||!password){
    errorEl.textContent='Please fill in all fields';
    return;
  }
  
  auth.signInWithEmailAndPassword(email,password)
    .then(userCredential=>{
      showToast('Welcome back! ♡');
      closeLoginModal();
    })
    .catch(error=>{
      errorEl.textContent=error.message;
    });
}

function toggleUserMenu(){
  const dropdown=document.getElementById('user-dropdown');
  dropdown.style.display=dropdown.style.display==='none'?'block':'none';
}

function logoutUser(){
  auth.signOut().then(()=>{
    showToast('See you next time! ♡');
    closeUserMenu();
  });
}

function goToAccountInfo(){
  closeUserMenu();
  showAccountPage();
}

function closeUserMenu(){
  document.getElementById('user-dropdown').style.display='none';
}

function updateAuthUI(user){
  const signupBtn=document.getElementById('signup-btn');
  const loginBtn=document.getElementById('login-btn');
  const userMenuWrapper=document.getElementById('user-menu-wrapper');
  const userEmailDisplay=document.getElementById('user-email-display');
  
  if(user){
    signupBtn.style.display='none';
    loginBtn.style.display='none';
    userMenuWrapper.style.display='block';
    userEmailDisplay.textContent=user.email;
  } else {
    signupBtn.style.display='block';
    loginBtn.style.display='block';
    userMenuWrapper.style.display='none';
  }
}

/* ══ ACCOUNT PAGE ══ */
function showAccountPage(){
  document.getElementById('tab-tracker').parentElement.parentElement.style.display='none';
  document.querySelector('.main-tabs').style.display='none';
  document.querySelector('.app-header').style.display='flex';
  document.querySelector('footer').style.display='none';
  document.getElementById('account-page').style.display='block';
  
  if(currentUser){
    document.getElementById('account-email').value=currentUser.email;
  }
}

function goBackToTracker(){
  document.getElementById('tab-tracker').parentElement.parentElement.style.display='block';
  document.querySelector('.main-tabs').style.display='flex';
  document.querySelector('footer').style.display='block';
  document.getElementById('account-page').style.display='none';
  document.getElementById('user-dropdown').style.display='none';
  renderTracker();
}

function updateAccountInfo(){
  const nameInput=document.getElementById('account-name');
  const displayName=nameInput.value.trim();
  const messageEl=document.getElementById('account-message');
  
  if(!currentUser)return;
  
  if(displayName){
    currentUser.updateProfile({displayName:displayName})
      .then(()=>{
        messageEl.style.color='var(--gr)';
        messageEl.textContent='Profile updated successfully! ♡';
        setTimeout(()=>messageEl.textContent='',3000);
      })
      .catch(error=>{
        messageEl.style.color='var(--rs)';
        messageEl.textContent=error.message;
      });
  } else {
    messageEl.style.color='var(--rs)';
    messageEl.textContent='Please enter a display name';
  }
}

function deleteAccountConfirm(){
  if(confirm('Are you sure? This action cannot be undone. All your data will be permanently deleted.')){
    deleteUserAccount();
  }
}

function deleteUserAccount(){
  if(!currentUser)return;
  
  const userId=currentUser.uid;
  currentUser.delete()
    .then(()=>{
      db.collection('users').doc(userId).delete();
      db.collection('transactions').where('userId','==',userId).get().then(snap=>{
        snap.forEach(doc=>doc.ref.delete());
      });
      db.collection('budgets').where('userId','==',userId).get().then(snap=>{
        snap.forEach(doc=>doc.ref.delete());
      });
      showToast('Account deleted');
      goBackToTracker();
    })
    .catch(error=>{
      alert('Error deleting account: '+error.message);
    });
}

/* ══ FIRESTORE OPERATIONS ══ */
async function loadTx(){
  if(!currentUser)return[];
  try{
    const snap=await db.collection('transactions').where('userId','==',currentUser.uid).get();
    return snap.docs.map(doc=>({id:doc.id,...doc.data()}));
  } catch(e){
    console.error('Error loading transactions:',e);
    return[];
  }
}

async function saveTx(arr){
  if(!currentUser)return;
  try{
    const batch=db.batch();
    const snap=await db.collection('transactions').where('userId','==',currentUser.uid).get();
    snap.forEach(doc=>batch.delete(doc.ref));
    arr.forEach(tx=>{
      const docRef=db.collection('transactions').doc();
      batch.set(docRef,{...tx,userId:currentUser.uid});
    });
    await batch.commit();
  } catch(e){
    console.error('Error saving transactions:',e);
  }
}

async function loadBudgets(){
  if(!currentUser)return{};
  try{
    const snap=await db.collection('budgets').where('userId','==',currentUser.uid).get();
    const result={};
    snap.forEach(doc=>{
      result[doc.data().month]=doc.data().budgets;
    });
    return result;
  } catch(e){
    console.error('Error loading budgets:',e);
    return{};
  }
}

async function saveBudgets(bgt){
  if(!currentUser)return;
  try{
    const batch=db.batch();
    const snap=await db.collection('budgets').where('userId','==',currentUser.uid).get();
    snap.forEach(doc=>batch.delete(doc.ref));
    Object.entries(bgt).forEach(([month,budgets])=>{
      const docRef=db.collection('budgets').doc();
      batch.set(docRef,{userId:currentUser.uid,month,budgets});
    });
    await batch.commit();
  } catch(e){
    console.error('Error saving budgets:',e);
  }
}

/* ══ AUTH STATE LISTENER ══ */
auth.onAuthStateChanged(async(user)=>{
  currentUser=user;
  updateAuthUI(user);
  
  if(user){
    txArr=await loadTx();
    budgets=await loadBudgets();
    renderTracker();
    showWelcome();
  } else {
    txArr=[];
    budgets={};
    document.getElementById('tab-tracker').style.display='block';
    document.getElementById('tab-summary').style.display='block';
    document.getElementById('tab-budget').style.display='block';
    const mainTabs=document.querySelectorAll('.main-tab');
    mainTabs.forEach(tab=>tab.style.opacity='0.5');
  }
});

/* ── TABS ── */
function switchTab(t,btn){
  if(!currentUser){
    alert('Please log in to use this feature');
    return;
  }
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.main-tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+t).classList.add('active');
  btn.classList.add('active');
  if(t==='summary'){populateYearSelect();renderSummary();}
  if(t==='budget'){initBudgetSelects();renderBudget();}
}

/* ── TYPE TOGGLE ── */
function setType(t){
  txType=t;
  ['expense','income','savings'].forEach(x=>document.getElementById('btn-'+x).className='toggle-btn'+(t===x?' active':''));
  populateCats();
  document.getElementById('cat-group').style.display=t==='savings'?'none':'flex';
}
function populateCats(){
  document.getElementById('inp-cat').innerHTML=(CATS[txType]||[]).map(c=>`<option>${c}</option>`).join('');
}
function formatAmt(el){
  const sel=el.selectionStart;
  const old=el.value;
  let v=el.value.replace(/[^0-9]/g,'');
  const oldDigits=old.replace(/[^0-9]/g,'').length;
  const formatted=v?v.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+' ₫':'';
  el.value=formatted;
  // restore cursor: count digits before cursor
  if(v){
    const newLen=formatted.replace(' ₫','').length;
    el.setSelectionRange(newLen,newLen);
  }
}
function handleAmtKey(e,el){
  if((e.key==='Backspace'||e.key==='Delete')&&!e.ctrlKey&&!e.metaKey){
    e.preventDefault();
    const start=el.selectionStart,end=el.selectionEnd;
    let v=el.value.replace(/[^0-9]/g,'');
    if(start!==end){
      // selection exists — clear all selected digits
      v='';
    } else if(v.length>0){
      v=v.slice(0,-1);
    }
    el.value=v?v.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+' ₫':'';
  }
  if(e.key==='a'&&(e.ctrlKey||e.metaKey)){
    // let browser select all, then next backspace will clear
    return;
  }
}

/* ── ADD TX ── */
async function addTx(){
  if(!currentUser){
    alert('Please log in to add transactions');
    return;
  }
  const raw=document.getElementById('inp-amount').value.replace(/[^0-9]/g,'');
  const amt=parseInt(raw);
  if(!amt||amt<=0){const i=document.getElementById('inp-amount');i.style.borderColor='var(--pd)';setTimeout(()=>i.style.borderColor='',800);return;}
  const note=document.getElementById('inp-note').value.trim()||'No description';
  const cat=txType==='savings'?'🐷 Monthly Savings':document.getElementById('inp-cat').value;
  const date=document.getElementById('inp-date').value||todayStr();
  txArr.unshift({id:Date.now(),type:txType,amount:amt,cat,note,date});
  await saveTx(txArr);
  document.getElementById('inp-amount').value='';
  document.getElementById('inp-note').value='';
  renderTracker();showToast('Added~ ♡');spawnConfetti();spawnPetals();
}

/* ── DELETE ── */
async function deleteTx(id){
  confirmCb=async()=>{txArr=txArr.filter(t=>t.id!==id);await saveTx(txArr);renderTracker();closeConfirm();};
  document.getElementById('confirm-overlay').style.display='block';
}
function closeConfirm(){document.getElementById('confirm-overlay').style.display='none';confirmCb=null;}
function doConfirm(){if(confirmCb)confirmCb();}

/* ── TOAST & FX ── */
function showToast(msg){
  const el=document.createElement('div');el.className='toast';el.textContent=msg;
  document.body.appendChild(el);setTimeout(()=>el.remove(),2100);
}
function spawnConfetti(){
  const wrap=document.createElement('div');wrap.className='confetti-wrap';document.body.appendChild(wrap);
  const colors=['#E8829A','#F4B8C8','#FDE8EF','#4CAF7D','#7BB8E8','#C9A8F0','#FFD6E7'];
  for(let i=0;i<35;i++){
    const p=document.createElement('div');p.className='confetti-piece';
    p.style.cssText=`left:${10+Math.random()*80}%;top:-10px;background:${colors[Math.floor(Math.random()*colors.length)]};animation-duration:${0.8+Math.random()*1}s;animation-delay:${Math.random()*0.4}s`;
    wrap.appendChild(p);
  }
  setTimeout(()=>wrap.remove(),1800);
}
function spawnPetals(){
  const petals=['🌸','🌷','✨','🎀','⭐'];
  for(let i=0;i<6;i++){
    const p=document.createElement('div');p.className='petal';
    p.textContent=petals[Math.floor(Math.random()*petals.length)];
    p.style.cssText=`left:${Math.random()*100}%;top:-30px;animation-duration:${2+Math.random()*2}s;animation-delay:${Math.random()*0.5}s;font-size:${12+Math.random()*10}px`;
    document.body.appendChild(p);setTimeout(()=>p.remove(),4500);
  }
}

/* ── TRACKER ── */
function renderTracker(){renderStats();renderFilters();renderList();}
function getMonthTx(y,m){return txArr.filter(t=>{const r=getYM(t.date);return r.y===y&&r.m===m;});}

function renderStats(){
  const y=now.getFullYear(),m=now.getMonth();
  const mTx=getMonthTx(y,m);
  const income=mTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense=mTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const savings=mTx.filter(t=>t.type==='savings').reduce((s,t)=>s+t.amount,0);
  const stats=[
    {icon:'💰',label:'Income',val:fmtMoney(income),col:'var(--gr)'},
    {icon:'🛍️',label:'Expenses',val:fmtMoney(expense),col:'var(--pd)'},
    {icon:'🐷',label:'Savings',val:fmtMoney(savings),col:'var(--bl)'},
  ];
  document.getElementById('stat-cards').innerHTML=stats.map((s,i)=>`
    <div class="stat-card" style="animation-delay:${i*0.1}s">
      <div class="icon-wrap">${s.icon}</div>
      <div class="label">${s.label}</div>
      <div class="amount" style="color:${s.col}">${s.val}</div>
    </div>`).join('');
}

function renderFilters(){
  const pills=['all','income','expense','savings'];
  document.getElementById('filter-bar').innerHTML=pills.map(p=>`
    <button class="filter-pill${filterType===p?' active':''}" onclick="setFilter('${p}')">${p.charAt(0).toUpperCase()+p.slice(1)}</button>`).join('');
}
function setFilter(f){filterType=f;renderFilters();renderList();}

function renderList(){
  searchQ=document.getElementById('search-inp').value.toLowerCase();
  const y=now.getFullYear(),m=now.getMonth();
  let filtered=getMonthTx(y,m).filter(t=>{
    if(filterType!=='all'&&t.type!==filterType)return false;
    if(searchQ&&!t.note.toLowerCase().includes(searchQ)&&!t.cat.toLowerCase().includes(searchQ))return false;
    return true;
  });
  const grouped={};filtered.forEach(t=>{if(!grouped[t.date])grouped[t.date]=[];grouped[t.date].push(t);});
  const dates=Object.keys(grouped).sort((a,b)=>b.localeCompare(a));
  const el=document.getElementById('tx-list');
  if(!filtered.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon">🌸</div><p>No transactions yet~ Add one ♡</p></div>`;return;}
  el.innerHTML=dates.map(d=>`
    <div class="date-group">
      <div class="date-header">${fmtDate(d)}</div>
      ${grouped[d].map(t=>`
        <div class="tx-item">
          <div class="tx-icon">${t.cat.split(' ')[0]}</div>
          <div class="tx-info">
            <div class="tx-note">${t.note}</div>
            <div class="tx-cat">${t.cat}</div>
          </div>
          <div class="tx-amount ${t.type}">${t.type==='expense'?'−':'+'}${fmtMoney(t.amount)}</div>
          <button class="del-btn" onclick="deleteTx(${t.id})">🗑</button>
        </div>`).join('')}
    </div>`).join('');
}

/* ── SUMMARY ── */
function populateYearSelect(){
  const baseYears=Array.from({length:31},(_,i)=>2020+i);
  const txYears=[...new Set(txArr.map(t=>getYM(t.date).y))];
  const years=[...new Set([...baseYears,...txYears])].sort((a,b)=>b-a);
  const sel=document.getElementById('sel-year');
  sel.innerHTML=years.map(y=>`<option value="${y}"${y===now.getFullYear()?' selected':''}>${y}</option>`).join('');
  const mSel=document.getElementById('sel-month');
  mSel.innerHTML=MONTH_NAMES.map((n,i)=>`<option value="${i}"${i===now.getMonth()?' selected':''}>${n}</option>`).join('');
}

function setSummaryView(v){
  summaryView=v;
  ['year','month','week'].forEach(x=>{
    const b=document.getElementById('vbtn-'+x);
    if(b)b.className='view-btn'+(v===x?' active':'');
  });
  document.getElementById('sel-month').style.display=(v==='month'||v==='week')?'block':'none';
  renderSummary();
}

function renderSummary(){
  const y=parseInt(document.getElementById('sel-year').value||now.getFullYear());
  const content=document.getElementById('summary-content');
  if(barChart){barChart.destroy();barChart=null;}
  if(yearChart){yearChart.destroy();yearChart=null;}
  if(pieChart){pieChart.destroy();pieChart=null;}
  if(summaryView==='year')renderYearView(y,content);
  else if(summaryView==='month')renderMonthView(y,content);
  else renderWeekView(y,content);
}

function getMonthData(y,m){
  const tx=txArr.filter(t=>{const r=getYM(t.date);return r.y===y&&r.m===m;});
  const income=tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense=tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const savings=tx.filter(t=>t.type==='savings').reduce((s,t)=>s+t.amount,0);
  return{tx,income,expense,savings,remaining:income-expense-savings};
}

function renderYearView(y,content){
  const rows=MONTH_NAMES.map((n,i)=>({name:n,m:i,d:getMonthData(y,i)}));
  const totInc=rows.reduce((s,r)=>s+r.d.income,0);
  const totExp=rows.reduce((s,r)=>s+r.d.expense,0);
  const totSav=rows.reduce((s,r)=>s+r.d.savings,0);

  content.innerHTML=`
    <div class="year-summary-box">
      <h3>✨ ${y} — Full Year</h3>
      <div class="sum-row"><span class="sum-label">💰 Total Income</span><span class="sum-val c-gr">${fmtMoney(totInc)}</span></div>
      <div class="sum-row"><span class="sum-label">🛍️ Total Expenses</span><span class="sum-val c-pd">${fmtMoney(totExp)}</span></div>
      <div class="sum-row"><span class="sum-label">🐷 Total Savings</span><span class="sum-val c-bl">${fmtMoney(totSav)}</span></div>
      <div class="sum-row"><span class="sum-label">🌸 Net (Income − Exp − Sav)</span><span class="sum-val ${totInc-totExp-totSav>=0?'c-gr':'c-rs'}">${fmtMoney(totInc-totExp-totSav)}</span></div>
    </div>
    <div class="chart-card-full"><h3>📅 Monthly Overview — ${y}</h3><canvas id="year-chart" height="120"></canvas></div>
    <div class="section-title" style="margin-bottom:12px"><span class="deco">🗓️</span> Month by Month</div>
    <table class="month-table">
      <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Savings</th><th>Remaining</th></tr></thead>
      <tbody>${rows.map(r=>`
        <tr${r.m===now.getMonth()&&y===now.getFullYear()?' class="active-row"':''}>
          <td><span class="month-name" onclick="drillMonth(${y},${r.m})">${r.name}</span></td>
          <td style="color:var(--gr);font-weight:700">${r.d.income?fmtMoney(r.d.income):'—'}</td>
          <td style="color:var(--pd);font-weight:700">${r.d.expense?fmtMoney(r.d.expense):'—'}</td>
          <td style="color:var(--bl);font-weight:700">${r.d.savings?fmtMoney(r.d.savings):'—'}</td>
          <td style="color:${r.d.remaining>=0?'var(--gr)':'var(--rs)'};font-weight:700">${(r.d.income||r.d.expense||r.d.savings)?fmtMoney(r.d.remaining):'—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;

  const labels=MONTH_NAMES.map(n=>n.slice(0,3));
  yearChart=new Chart(document.getElementById('year-chart'),{
    type:'bar',
    data:{labels,datasets:[
      {label:'Income',data:rows.map(r=>r.d.income),backgroundColor:'#A8D5B5',borderRadius:5},
      {label:'Expense',data:rows.map(r=>r.d.expense),backgroundColor:'#F4B8C8',borderRadius:5},
      {label:'Savings',data:rows.map(r=>r.d.savings),backgroundColor:'#B8D8F4',borderRadius:5},
    ]},
    options:{plugins:{legend:{labels:{font:{family:'DM Sans',size:11},color:'#9E6878',boxWidth:10}}},
      scales:{x:{grid:{display:false},ticks:{color:'#9E6878',font:{family:'DM Sans',size:11}}},
              y:{grid:{color:'#FDE8EF'},ticks:{color:'#9E6878',font:{family:'DM Sans',size:10},callback:v=>{
                if(v>=1000000)return(v/1000000).toFixed(0)+'M';
                if(v>=1000)return(v/1000).toFixed(0)+'K';return v;
              }}}}}
  });
}

function drillMonth(y,m){
  setSummaryView('month');
  document.getElementById('sel-year').value=y;
  document.getElementById('sel-month').value=m;
  renderSummary();
}

function renderMonthView(y,content){
  const m=parseInt(document.getElementById('sel-month').value??now.getMonth());
  const d=getMonthData(y,m);
  const catMap={};d.tx.filter(t=>t.type==='expense').forEach(t=>{catMap[t.cat]=(catMap[t.cat]||0)+t.amount;});
  const catLabels=Object.keys(catMap),catVals=Object.values(catMap);
  const palette=['#F4B8C8','#E8829A','#A8D5B5','#C5B8F4','#F4CEB8','#B8E4F4','#FDD9A0','#D4F4B8','#F4B8E4'];
  content.innerHTML=`
    <div class="year-summary-box">
      <h3>🗓️ ${MONTH_NAMES[m]} ${y}</h3>
      <div class="sum-row"><span class="sum-label">💰 Income</span><span class="sum-val c-gr">${fmtMoney(d.income)}</span></div>
      <div class="sum-row"><span class="sum-label">🛍️ Expenses</span><span class="sum-val c-pd">${fmtMoney(d.expense)}</span></div>
      <div class="sum-row"><span class="sum-label">🐷 Savings</span><span class="sum-val c-bl">${fmtMoney(d.savings)}</span></div>
      <div class="sum-row"><span class="sum-label">🌸 Remaining</span><span class="sum-val ${d.remaining>=0?'c-gr':'c-rs'}">${fmtMoney(d.remaining)}</span></div>
    </div>
    <div class="charts-grid">
      <div class="chart-card"><h3>📅 Weekly Breakdown</h3><canvas id="month-bar-chart"></canvas></div>
      <div class="chart-card"><h3>🛍️ Expenses by Category</h3><canvas id="month-pie-chart"></canvas></div>
    </div>
    <div class="section-title" style="margin-bottom:12px"><span class="deco">🌸</span> All Transactions</div>
    ${renderTxList(d.tx)}`;

  const wInc=[0,0,0,0],wExp=[0,0,0,0],wSav=[0,0,0,0];
  d.tx.forEach(t=>{const r=getYM(t.date);if(t.type==='income')wInc[r.w]+=t.amount;else if(t.type==='expense')wExp[r.w]+=t.amount;else wSav[r.w]+=t.amount;});
  if(barChart)barChart.destroy();
  barChart=new Chart(document.getElementById('month-bar-chart'),{
    type:'bar',data:{labels:['W1','W2','W3','W4'],datasets:[
      {label:'Income',data:wInc,backgroundColor:'#A8D5B5',borderRadius:5},
      {label:'Expense',data:wExp,backgroundColor:'#F4B8C8',borderRadius:5},
      {label:'Savings',data:wSav,backgroundColor:'#B8D8F4',borderRadius:5},
    ]},
    options:{plugins:{legend:{labels:{font:{family:'DM Sans',size:11},color:'#9E6878',boxWidth:10}}},
      scales:{x:{grid:{display:false},ticks:{color:'#9E6878',font:{family:'DM Sans',size:11}}},
              y:{grid:{color:'#FDE8EF'},ticks:{color:'#9E6878',font:{family:'DM Sans',size:10},callback:v=>{if(v>=1000000)return(v/1000000).toFixed(1)+'M';if(v>=1000)return(v/1000).toFixed(0)+'K';return v;}}}}}
  });
  if(pieChart)pieChart.destroy();
  if(catLabels.length)pieChart=new Chart(document.getElementById('month-pie-chart'),{
    type:'doughnut',
    data:{labels:catLabels,datasets:[{data:catVals,backgroundColor:palette.slice(0,catLabels.length),borderWidth:2,borderColor:'#FFFBFD',hoverOffset:8}]},
    options:{plugins:{legend:{position:'right',labels:{font:{family:'DM Sans',size:11},color:'#9E6878',boxWidth:12,padding:8}}}}
  });
}

function renderWeekView(y,content){
  const m=parseInt(document.getElementById('sel-month').value??now.getMonth());
  const d=getMonthData(y,m);
  const weeks=[{label:'Week 1 (1–7)',n:0},{label:'Week 2 (8–14)',n:1},{label:'Week 3 (15–21)',n:2},{label:'Week 4 (22+)',n:3}];
  content.innerHTML=`<div class="section-title" style="margin-bottom:14px"><span class="deco">📆</span> ${MONTH_NAMES[m]} ${y} — Weekly</div>`+
    weeks.map(w=>{
      const wTx=d.tx.filter(t=>getYM(t.date).w===w.n);
      const inc=wTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
      const exp=wTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
      const sav=wTx.filter(t=>t.type==='savings').reduce((s,t)=>s+t.amount,0);
      return`<div class="year-summary-box" style="margin-bottom:14px">
        <h3>📆 ${w.label}</h3>
        <div class="sum-row"><span class="sum-label">💰 Income</span><span class="sum-val c-gr">${fmtMoney(inc)}</span></div>
        <div class="sum-row"><span class="sum-label">🛍️ Expenses</span><span class="sum-val c-pd">${fmtMoney(exp)}</span></div>
        <div class="sum-row"><span class="sum-label">🐷 Savings</span><span class="sum-val c-bl">${fmtMoney(sav)}</span></div>
        <div class="sum-row"><span class="sum-label">🌸 Remaining</span><span class="sum-val ${inc-exp-sav>=0?'c-gr':'c-rs'}">${fmtMoney(inc-exp-sav)}</span></div>
        ${wTx.length?renderTxList(wTx):`<div class="empty-state" style="padding:20px"><div class="empty-icon" style="font-size:26px">🌸</div><p>No transactions</p></div>`}
      </div>`;
    }).join('');
}

function renderTxList(txList){
  if(!txList.length)return`<div class="empty-state"><div class="empty-icon">🌸</div><p>No transactions ♡</p></div>`;
  const grouped={};txList.forEach(t=>{if(!grouped[t.date])grouped[t.date]=[];grouped[t.date].push(t);});
  const dates=Object.keys(grouped).sort((a,b)=>b.localeCompare(a));
  return dates.map(d=>`
    <div class="date-group">
      <div class="date-header">${fmtDate(d)}</div>
      ${grouped[d].map(t=>`
        <div class="tx-item">
          <div class="tx-icon">${t.cat.split(' ')[0]}</div>
          <div class="tx-info"><div class="tx-note">${t.note}</div><div class="tx-cat">${t.cat}</div></div>
          <div class="tx-amount ${t.type}">${t.type==='expense'?'−':'+'}${fmtMoney(t.amount)}</div>
        </div>`).join('')}
    </div>`).join('');
}

/* ── BUDGET ── */
function initBudgetSelects(){
  const mSel=document.getElementById('budget-month-sel');
  const ySel=document.getElementById('budget-year-sel');
  mSel.innerHTML=MONTH_NAMES.map((n,i)=>`<option value="${i}"${i===now.getMonth()?' selected':''}>${n}</option>`).join('');
  const years=Array.from({length:31},(_,i)=>2020+i);
  ySel.innerHTML=years.map(y=>`<option value="${y}"${y===now.getFullYear()?' selected':''}>${y}</option>`).join('');
}

function budgetKey(y,m){return`${y}-${String(m+1).padStart(2,'0')}`;}

async function renderBudget(){
  const m=parseInt(document.getElementById('budget-month-sel').value);
  const y=parseInt(document.getElementById('budget-year-sel').value);
  document.getElementById('budget-month-label').textContent=`${MONTH_NAMES[m]} ${y}`;
  const key=budgetKey(y,m);
  const bgt=budgets[key]||{};
  const mTx=txArr.filter(t=>{const r=getYM(t.date);return r.y===y&&r.m===m&&t.type==='expense';});
  const expCats=CATS.expense;
  const spent={};mTx.forEach(t=>{spent[t.cat]=(spent[t.cat]||0)+t.amount;});

  const grid=document.getElementById('budget-grid-content');
  grid.innerHTML=`<div class="budget-grid">${expCats.map(cat=>{
    const s=spent[cat]||0;
    const b=bgt[cat]||0;
    const pct=b>0?Math.min(100,Math.round(s/b*100)):0;
    const barClass=pct>=100?'over':pct>=80?'warn':'ok';
    return`<div class="budget-item">
      <div class="budget-item-header">
        <span class="budget-cat">${cat}</span>
        <span class="budget-vals">${fmtMoney(s)} / ${b?fmtMoney(b):'—'}</span>
      </div>
      ${b>0?`<div class="budget-bar-wrap"><div class="budget-bar ${barClass}" style="width:${pct}%"></div></div>
      <div style="font-size:11px;color:${pct>=100?'var(--rs)':pct>=80?'#f5a623':'var(--gr)'}">
        ${pct>=100?'Over budget! 🥺':`${pct}% used`}
      </div>`:'<div style="font-size:11px;color:var(--tm)">No budget set</div>'}
      <div class="budget-input-row">
        <input class="budget-inp" type="text" placeholder="Set budget ₫" id="bgt-${cat.replace(/[^a-z0-9]/gi,'_')}"
          value="${b?b.toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.')+'':''}"
          oninput="fmtBgtInp(this)" onkeydown="handleBgtKey(event,this)">
        <button class="budget-save-btn" onclick="saveBudgetItem('${cat.replace(/'/g,"\\'")}',${y},${m})">Save</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function fmtBgtInp(el){
  let v=el.value.replace(/[^0-9]/g,'');
  el.value=v?v.replace(/\B(?=(\d{3})+(?!\d))/g,'.'):'';
}
function handleBgtKey(e,el){
  if((e.key==='Backspace'||e.key==='Delete')&&!e.ctrlKey&&!e.metaKey){
    e.preventDefault();
    const start=el.selectionStart,end=el.selectionEnd;
    let v=el.value.replace(/[^0-9]/g,'');
    if(start!==end){
      v='';
    } else if(v.length>0){
      v=v.slice(0,-1);
    }
    el.value=v?v.replace(/\B(?=(\d{3})+(?!\d))/g,'.'):'';
  }
}

async function saveBudgetItem(cat,y,m){
  const key=budgetKey(y,m);
  const inpId='bgt-'+cat.replace(/[^a-z0-9]/gi,'_');
  const el=document.getElementById(inpId);
  const val=parseInt(el.value.replace(/[^0-9]/g,''))||0;
  if(!budgets[key])budgets[key]={};
  budgets[key][cat]=val;
  await saveBudgets(budgets);
  renderBudget();
  showToast('Budget saved ♡');
}

function showWelcome(){
  if(!currentUser)return;
  document.getElementById('welcome-overlay').style.display='flex';
}
function closeWelcome(){document.getElementById('welcome-overlay').style.display='none';}

/* ── INIT ── */
document.getElementById('inp-date').value=todayStr();
populateCats();
