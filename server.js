const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const { Pool } = require('pg');

app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Assuming your HTML files are in a 'public' folder

// Connecting database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log('Connected to findHelpers PostgreSQL Database'))
  .catch(err => console.error('Database connection failed:', err));

// Serve login.html as homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// User signup
app.post('/signUp/user', (req, res) => {
    const { name, email, password, contact } = req.body;
    if (!name || !email || !password || !contact) {
        return res.status(400).send("Missing required fields: name, email, password, contact");
    }
    pool.query('select * from users where user_email=$1', [email], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Server error during user email check.");
        }
        if (results.rowCount > 0) {
            return res.status(409).send("User with this email already exists");
        }
        pool.query('insert into users (user_name, user_email, user_password, user_contact ) values ($1,$2,$3,$4) RETURNING user_id, user_name, user_email', [name, email, password, contact], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Server error during user signup.");
            }
            // Send back the created user's data
            res.status(200).json({
                message: "User signUp successful..",
                id: results.rows[0].user_id,
                name: results.rows[0].user_name,
                email: results.rows[0].user_email
            });
        });
    });
});

// Service professional signup
app.post('/signUp/serviceProfessional', (req, res) => {
    const { name, email, password, contact, serviceId, area } = req.body;
    if (!name || !email || !password || !contact || !serviceId || !area) {
        return res.status(400).send("Missing required fields: name, email, password, contact, serviceId, area");
    }
    pool.query('select * from serviceprofessionals where sp_email=$1', [email], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Server error during service professional email check.");
        }
        if (results.rowCount > 0) {
            return res.status(409).send("Service professional with this email already exists");
        }
        console.log(name, email, password, contact);
        pool.query('insert into serviceprofessionals (sp_name, sp_email, sp_password, sp_contact,ser_id, sp_area ) values ($1,$2,$3,$4,$5,$6) RETURNING sp_id, sp_name, sp_email', [name, email, password, contact, serviceId, area], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Server error during service professional signup.");
            }
            // Send back the created SP's data
            res.status(200).json({
                message: "Service Professional signUp successful..",
                id: results.rows[0].sp_id,
                name: results.rows[0].sp_name,
                email: results.rows[0].sp_email
            });
        });
    });
});

// Login routes
// To verify user credentials when he logins
app.post('/login/user', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).send("Please send both email and password.");
    }
    pool.query('select * from users where user_email=$1', [email], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Server error during user login.");
        }
        if (results.rowCount === 0) {
            // No user found
            return res.status(401).send("Invalid email or password.");
        }
        const user = results.rows[0];
        if (password !== user.user_password) {
            return res.status(401).send("Incorrect password"); // Use return here
        }
        // CORRECTED: Ensure user_id, user_name, user_email are sent for client-side storage
        res.status(200).json({
            message: "Login successful",
            id: user.user_id,
            name: user.user_name,
            email: user.user_email
        });
    });
});

// Service professional login
app.post('/login/serviceProfessional', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).send("Please send both email and password.");
    }
    pool.query('select * from serviceprofessionals where sp_email=$1', [email], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Server error during service professional login.");
        }
        if (results.rowCount === 0) {
            // No user found
            return res.status(401).send("Invalid email or password.");
        }
        const serviceProfessional = results.rows[0];
        if (password !== serviceProfessional.sp_password) {
            return res.status(401).send("Incorrect password");
        }
        // CORRECTED: Ensure sp_id, sp_name, sp_email are sent for client-side storage
        res.status(200).json({
            message: "Login successful",
            id: serviceProfessional.sp_id,
            name: serviceProfessional.sp_name,
            email: serviceProfessional.sp_email
        });
    });
});

// Forgot-password
app.post('/forgotPassword', (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
        return res.status(400).send("Please send both email and new password.");
    }
    pool.query('select * from users where user_email=$1', [email], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Server error during password reset check.");
        }
        if (results.rowCount > 0) {
            pool.query('update users set user_password = $1 where user_email = $2', [newPassword, email], (err2, results2) => {
                if (err2) {
                    console.error(err2);
                    return res.status(500).send("Error updating user password.");
                }
                return res.status(200).send("User password updated successfully.");
            });
        }
        else {
            pool.query('select * from serviceprofessionals where sp_email=$1', [email], (err3, results3) => {
                if (err3) {
                    console.error(err3);
                    return res.status(500).send("Server error during password reset check for service professional.");
                }
                if (results3.rowCount > 0) {
                    pool.query('update serviceprofessionals set sp_password=$1 where sp_email=$2', [newPassword, email], (err4, results4) => {
                        if (err4) {
                            console.error(err4);
                            return res.status(500).send("Unable to update new password for service professional.");
                        }
                        return res.status(200).send("Password updated successfully.");
                    });
                }
                else {
                    return res.status(404).send("Entered email is not found in both users and service professionals tables.");
                }
            });
        }
    });
});

// Users' routes
// To get available services for user
app.get('/services', (req, res) => {
    pool.query('select * from services', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error in getting services.');
        }
        else {
            res.json(results.rows);
        }
    });
});

// To get service professional based on the service they provide
app.get('/serviceProfessionals/:ser_id', (req, res) => {
    const serviceId = req.params.ser_id;
    pool.query('select * from serviceprofessionals where ser_id = $1', [serviceId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send(`Error in getting the service professional with id : ${serviceId}`);
        }
        else {
            res.json(results.rows);
        }
    });
});

// To add a new service request sent by the user
app.post('/requests', (req, res) => {
    const { user_id, sp_id, ser_id, req_user_name, contact, serviceDate, serviceTime, address } = req.body;
    // Added validation for required fields
    if (!user_id || !sp_id || !ser_id || !req_user_name || !contact || !serviceDate || !serviceTime || !address) {
        return res.status(400).send("Missing required request details.");
    }
    pool.query('insert into requests (user_id, sp_id, ser_id, req_user_name, contact, serviceDate, serviceTime, address) values ($1,$2,$3,$4,$5,$6,$7,$8)', [user_id, sp_id, ser_id, req_user_name, contact, serviceDate, serviceTime, address], (err, results) => {
        if (err) {
            console.log("Error while adding request details", err);
            return res.status(500).send("Server error while adding request.");
        }
        else {
            res.status(200).send("Request details stored successfully.");
        }
    });
});

// To get all the requests made by a particular user
app.get('/requests/users/:user_id', (req, res) => {
    const userId = req.params.user_id;
    pool.query('select * from requests where user_id=$1', [userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send(`Unable to get request data of user with id ${userId}`);
        }
        else {
            res.json(results.rows);
        }
    });
});

// Service professional routes
// To get all pending requests received by a particular service professional
app.get('/pendingRequests/serviceProfessionals/:sp_id', (req, res) => {
    const sp_id = req.params.sp_id;
    pool.query('select * from requests where sp_id=$1 and requestStatus = \'pending\'', [sp_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send(`Unable to get requests data received by the service professional with id : ${sp_id}`);
        }
        else {
            res.json(results.rows);
        }
    });
});

// To get all the requests received by a particular professional
app.get('/requests/serviceProfessionals/:sp_id', (req, res) => {
    const sp_id = req.params.sp_id;
    pool.query('select * from requests where sp_id=$1', [sp_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send(`Unable to get requests data received by the service professional with id : ${sp_id}`);
        }
        else {
            res.json(results.rows);
        }
    });
});

// To update the status of the request
app.put('/requests/:req_id/status', (req, res) => {
    const reqId = req.params.req_id;
    const { newStatus } = req.body;
    if (!newStatus) {
        return res.status(400).send("New status is required.");
    }

    pool.query('UPDATE requests SET requestStatus=$1 where req_id=$2', [newStatus, reqId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error in updating the data.");
        }
        else if (results.rowCount === 0) {
            return res.status(404).send(`No request found with id ${reqId}`);
        }
        else {
            res.send(`Request with id ${reqId} updated to status : ${newStatus}`);
        }
    });
});

const port = process.env.PORT || 4200;

app.listen(port, () => {
    console.log("Server is running on port", port);
});