const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();


app.use(express.json());
app.use(cors());
app.use(express.static('public'));

//connecting database
const url = require("url");

// Parse Railway's MYSQL_URL
const dbUrl = process.env.DATABASE_URL; 
console.log("DATABSE_URL is : ", process.env.DATABASE_URL);
const parsedUrl = url.parse(dbUrl);
const [user, password] = parsedUrl.auth.split(":");



const db = mysql.createConnection({
  host: parsedUrl.hostname,
  user: user,
  password: password,
  database: parsedUrl.pathname.replace("/", ""), 
  port: parsedUrl.port
});


db.connect(err =>{
    if(err){
        console.error('DB coonection failed..');
        return;
    }
    console.log('Connected to findHelpers Database')

});

//user signup
app.post('/signUp/user',(req,res)=>{
    const {name, email, password, contact} = req.body;
    if(!name || !email || !password || !contact){
        return res.status(400).send("name, email, password, contact");
    }
    db.query('select * from users where user_email=?',[email],(err,results)=>{
        if(err){
            console.error(err);
            return res.status(500).send("server error");
        }
        if(results.length>0){
            return res.status(409).send("User with this email already exists");
        }
        db.query('insert into users (user_name, user_email, user_password, user_contact ) values (?,?,?,?)',[name, email, password, contact],(err,results)=>{
            if(err){
                console.error(err);
                return res.status(500).send("server error");
            }
            res.status(200).send("User signUp successful..");
        });
    });
});


//service professional signup
app.post('/signUp/serviceProfessional',(req,res)=>{
    const {name, email, password, contact,serviceId, area} = req.body;
    if(!name || !email || !password || !contact || !serviceId || !area){
        return res.status(400).send("name, email, password, contact, serviceId, area");
    }
    db.query('select * from serviceProfessionals where sp_email=?',[email],(err,results)=>{
        if(err){
            console.error(err);
            return res.status(500).send("server error");
        }
        if(results.length>0){
            return res.status(409).send("Service professional with this email already exists");
        }
        console.log(name,email, password, contact);
        db.query('insert into serviceProfessionals (sp_name, sp_email, sp_password, sp_contact,ser_id, sp_area ) values (?,?,?,?,?,?)',[name, email, password, contact, serviceId, area],(err,results)=>{
            if(err){
                console.error(err);
                return res.status(500).send("server error");
            }
            res.status(200).send("Service Professional signUp successful..");
        });
    });
});


//login routes
// to verify user credentials when he logins
app.post('/login/user',(req,res)=>{
    const {email, password} = req.body;
    if(!email || !password){
        return res.status(400).send("send both email and password..");
    }
    db.query('select * from users where user_email=?',[email],(err,results)=>{
        if(err){
            console.error(err);
            return res.status(500).send("server error");
        }
        if(results.length === 0){
            // no user found
            return res.status(401).send("invalid email or password..");
        }
        const user =results[0];
        if(password !== user.user_password){
            res.status(401).send("Incorrect password");
        }
        res.status(200).json({
            message : "Login successful",
            id : user.user_id,
            name : user.user_name,
            email : user.user_email
        });
    });
});

//service professional login
app.post('/login/serviceProfessional',(req,res)=>{
    const {email, password} = req.body;
    if(!email || !password){
        return res.status(400).send("send both email and password..");
    }
    db.query('select * from serviceProfessionals where sp_email=?',[email],(err,results)=>{
        if(err){
            console.error(err);
            return res.status(500).send("server error");
        }
        if(results.length === 0){
            // no user found
            return res.status(401).send("invalid email or password..");
        }
        const serviceProfessional =results[0];
        if(password !== serviceProfessional.sp_password){
            return res.status(401).send("Incorrect password");
        }
        res.status(200).json({
            message : "Login successful",
            id : serviceProfessional.sp_id,
            name : serviceProfessional.sp_name,
            email : serviceProfessional.sp_email
        });
    });
});


//forgot-password
app.post('/forgotPassword',(req,res)=>{
    const {email, newPassword} = req.body;
    if(!email || !newPassword){
        return res.status(400).send("send both email and new password");
    }
    db.query('select * from users where user_email=?',[email],(err,results)=>{
        if(err){
            console.error(err);
            return res.status(500).send("server error");
        }
        if(results.length>0){
            db.query('update users set user_password = ? where user_email = ?',[newPassword, email],(err2,results2)=>{
                if(err2){
                    console.error(err2);
                    return res.status(500).send("Error updating password..");
                }
                return res.status(200).send("User password updated successfully..");
            });
        }
        else{
            db.query('select * from serviceprofessionals where sp_email=?',[email],(err3,results3)=>{
                if(err3){
                    console.error(err3);
                    return res.status(500).send("server error..");
                }
                if(results3.length>0){
                    db.query('update serviceprofessionals set sp_password=? where sp_email=?',[newPassword,email],(err4,results4)=>{
                        if(err4){
                            console.error(err4);
                            return res.status(500).send("Unable to update new password for service professional..");
                        }
                        return res.status(200).send("Password updated successfully..");
                    })
                }
                else{
                    return res.status(404).send("Entered email is not found in both users and service professionals table..");
                }
            });
        }
    });
});



//users' routes
// to get available services for user
app.get('/services',(req,res)=>{
    db.query('select * from services',(err,results)=>{
        if(err){
            console.error(err);
            return res.status(500).send('Error in getting services..');
        }
        else{
            res.json(results);
        }
    });
});

// to get service professional based on the service they provide
app.get('/serviceProfessionals/:ser_id',(req,res)=>{
    const serviceId = req.params.ser_id;
    db.query('select * from serviceProfessionals where ser_id = ?', [serviceId], (err,results)=>{
        if(err){
            console.error(err);
            return res.status(500).send(`Error in getting the service professional with id : ${serviceId}`);
        }
        else{
            res.json(results);
        }
    });
});

// to add a new service request sent by the user
app.post('/requests',(req,res)=>{
    const {user_id, sp_id, ser_id, req_user_name, contact, serviceDate, serviceTime, address}=req.body;
    db.query('insert into requests (user_id, sp_id, ser_id, req_user_name, contact, serviceDate, serviceTime, address) values (?,?,?,?,?,?,?,?)',[user_id, sp_id, ser_id, req_user_name, contact, serviceDate, serviceTime, address],(err,results)=>{
        if(err){
            console.log("Error while adding request details",err);
            return res.status(500).send("Server error");
        }
        else{
            res.status(200).send("Request details stored successfully..");
        }
    })
});

// to get all the requests made by a particular user
app.get('/requests/users/:user_id',(req,res)=>{
    const userId = req.params.user_id;
    db.query('select * from requests where user_id=?',[userId],(err,results)=>{
        if(err){
            console.error(err);
            return res.status(500).send(`Unable to get request data of user with id ${userId}`);
        }
        else{
            res.json(results);
        }
    });
});



//service professional routes
// to get all pending requests received by a particular service professional
app.get('/pendingRequests/serviceProfessionals/:sp_id',(req,res)=>{
    const sp_id = req.params.sp_id;
    db.query('select * from requests where sp_id=? and requestStatus = "pending"',[sp_id],(err,results)=>{
        if(err){
            console.error(err);
            return res.status(500).send(`Unable to get requests data received by the service professional with id : ${ser_id}`);
        }
        else{
            res.json(results);
        }
    });
});

// to get all the requests received by a particular professional
app.get('/requests/serviceProfessionals/:sp_id',(req,res)=>{
    const sp_id = req.params.sp_id;
    db.query('select * from requests where sp_id=?',[sp_id],(err,results)=>{
        if(err){
            console.error(err);
            return res.status(500).send(`Unable to get requests data received by the service professional with id : ${ser_id}`);
        }
        else{
            res.json(results);
        }
    });
});

// to update the status of the request
app.put('/requests/:req_id/status',(req,res)=>{
    const reqId = req.params.req_id;
    const {newStatus} = req.body;

    db.query('UPDATE requests SET requestStatus=? where req_id=?',[newStatus, reqId],(err,results)=>{
        if(err){
            console.error(err);
            return res.status(500).send("Error in updating the data");
        }
        else if(results.affectedRows === 0){
            return res.status(404).send(`No request found with id ${reqId}`);
        }
        else{
            res.send(`Request with id ${reqId} updated to status : ${newStatus}`);
        }
    });
});

const port = process.env.PORT || 4200;

app.listen(port,()=>{
    console.log("server is running..");
});

