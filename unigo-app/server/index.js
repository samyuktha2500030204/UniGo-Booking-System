import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, 'db.json');
const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || 'change-this-demo-secret-before-deployment';
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173'
}));
app.use(express.json());
function readDB(){ return JSON.parse(fs.readFileSync(DB,'utf8')); }
function writeDB(data){ fs.writeFileSync(DB, JSON.stringify(data,null,2)); }
function tokenFor(user){ return jwt.sign({id:user.id,role:user.role},SECRET,{expiresIn:'12h'}); }
function auth(req,res,next){ try { const h=req.headers.authorization||''; req.auth=jwt.verify(h.replace(/^Bearer\s+/i,''),SECRET); next(); } catch { res.status(401).json({message:'Please log in again.'}); } }
function admin(req,res,next){ if(req.auth?.role!=='admin') return res.status(403).json({message:'Admin access required.'}); next(); }

// A demo administrator is created automatically. Change these credentials before deployment.
const seedAdmin = async () => {
 const db=readDB();
 if(!db.users.some(u=>u.role==='admin')) { db.users.push({id:uuid(),name:'UniGo Admin',email:'admin@unigo.com',phone:'',password:await bcrypt.hash('Admin@123',10),role:'admin',createdAt:new Date().toISOString()}); writeDB(db); }
};
await seedAdmin();

app.post('/api/auth/register', async (req,res)=>{
 const {name,email,phone,password}=req.body;
 if(!name?.trim()||!email?.trim()||!phone?.trim()||!password||password.length<6) return res.status(400).json({message:'Enter your name, email, phone and a password of at least 6 characters.'});
 const db=readDB(); const normalized=email.trim().toLowerCase();
 if(db.users.some(u=>u.email===normalized)) return res.status(409).json({message:'An account with this email already exists.'});
 const user={id:uuid(),name:name.trim(),email:normalized,phone:phone.trim(),password:await bcrypt.hash(password,10),role:'user',createdAt:new Date().toISOString()};
 db.users.push(user); writeDB(db);
 res.status(201).json({token:tokenFor(user),user:{id:user.id,name:user.name,email:user.email,phone:user.phone,role:user.role,createdAt:user.createdAt}});
});
app.post('/api/auth/login', async (req,res)=>{
 const {email,password,role}=req.body; const db=readDB();
 const user=db.users.find(u=>u.email===String(email||'').trim().toLowerCase() && u.role===(role==='admin'?'admin':'user'));
 if(!user || !await bcrypt.compare(password||'',user.password)) return res.status(401).json({message:'Invalid email or password.'});
 res.json({token:tokenFor(user),user:{id:user.id,name:user.name,email:user.email,phone:user.phone,role:user.role,createdAt:user.createdAt}});
});
app.get('/api/me',auth,(req,res)=>{const u=readDB().users.find(x=>x.id===req.auth.id); if(!u)return res.status(404).json({message:'User not found.'}); const {password,...safe}=u; res.json(safe);});
app.get('/api/items',(req,res)=>res.json(readDB().items.filter(i=>i.active)));
app.get('/api/bookings/mine',auth,(req,res)=>res.json(readDB().bookings.filter(b=>b.userId===req.auth.id)));
app.post('/api/bookings',auth,(req,res)=>{
 const {itemId,quantity=1,details=''}=req.body; const db=readDB(); const item=db.items.find(i=>i.id===itemId&&i.active);
 if(!item)return res.status(404).json({message:'This item is no longer available.'});
 const qty=Math.max(1,Math.min(20,Number(quantity)||1)); const user=db.users.find(u=>u.id===req.auth.id);
 const booking={id:'UG-'+uuid().slice(0,8).toUpperCase(),userId:user.id,userName:user.name,userEmail:user.email,type:item.type,itemName:item.name,quantity:qty,unitPrice:item.price,amount:item.price*qty,details:String(details).slice(0,500),status:'Confirmed',createdAt:new Date().toISOString()};
 db.bookings.unshift(booking);writeDB(db);res.status(201).json(booking);
});
app.get('/api/admin/summary',auth,admin,(req,res)=>{
 const db=readDB(); const users=db.users.filter(u=>u.role==='user'); const bookings=db.bookings;
 const activeBookings=bookings.filter(b=>b.status==='Confirmed');
 res.json({totalUsers:users.length,totalBookings:bookings.length,revenue:activeBookings.reduce((s,b)=>s+b.amount,0),activeUsers:users.filter(u=>bookings.some(b=>b.userId===u.id)).length});
});
app.get('/api/admin/users',auth,admin,(req,res)=>res.json(readDB().users.filter(u=>u.role==='user').map(({password,...u})=>({...u,bookingCount:readDB().bookings.filter(b=>b.userId===u.id).length}))));
app.get('/api/admin/bookings',auth,admin,(req,res)=>res.json(readDB().bookings));
app.post('/api/admin/items',auth,admin,(req,res)=>{
 const {type,name,category,price,description,image}=req.body;
 if(!['Movie','Food','Transport','Event'].includes(type)||!name?.trim()||!Number.isFinite(Number(price))||Number(price)<0) return res.status(400).json({message:'Enter a valid category, name and non-negative price.'});
 const db=readDB(); const item={id:uuid(),type,name:name.trim(),category:category||'',price:Number(price),description:description||'',image:image||'',active:true};db.items.unshift(item);writeDB(db);res.status(201).json(item);
});
app.put('/api/admin/items/:id',auth,admin,(req,res)=>{
 const db=readDB(),i=db.items.findIndex(x=>x.id===req.params.id);if(i<0)return res.status(404).json({message:'Item not found.'});
 const old=db.items[i],{type,name,category,price,description,image,active}=req.body;
 if(type&&!['Movie','Food','Transport','Event'].includes(type))return res.status(400).json({message:'Invalid category.'});
 if(price!==undefined&&(!Number.isFinite(Number(price))||Number(price)<0))return res.status(400).json({message:'Price must be zero or more.'});
 db.items[i]={...old,...(type?{type}:{}),...(name!==undefined?{name:String(name).trim()}:{}),...(category!==undefined?{category}:{}),...(price!==undefined?{price:Number(price)}:{}),...(description!==undefined?{description}:{}),...(image!==undefined?{image}:{}),...(active!==undefined?{active:Boolean(active)}:{})};writeDB(db);res.json(db.items[i]);
});
app.delete('/api/admin/items/:id',auth,admin,(req,res)=>{const db=readDB(),item=db.items.find(x=>x.id===req.params.id);if(!item)return res.status(404).json({message:'Item not found.'});item.active=false;writeDB(db);res.json({message:'Item removed from the user catalogue.'});});
app.listen(PORT,()=>console.log(`UniGo API running at http://localhost:${PORT}`));
