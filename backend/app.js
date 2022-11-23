const api = require("lambda-api")();
const functions = require("./functions");
var nodemailer = require('nodemailer');
const gmailUser = 'nightskymagnify@gmail.com';
const gmailPass = process.env.EMAILPASS;
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailUser,
        pass: gmailPass
    }
});

api.use((req, res, next) => {
    res.cors({headers:'*'})
    next();
});

api.options('/*', (req,res) => {
    res.status(200).send({});
})

api.post("/email", async (req, res) => {

    let email = req.body.email;
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;

    let queryResult = await functions.query(email,["email","active"]);

    if (queryResult.length == 0) {

        let payload = {
            email: email,
            firstName: firstName,
            lastName: lastName,
            active: true,
            id: Date.now()
        }

        let putResult = await functions.put(payload);

        if (putResult.$metadata.httpStatusCode == 200) {
            var mailOptions = {
                from: `Magnify <${gmailUser}>`,
                to: email,
                subject: `Hey ${firstName}!`,
                text: 'Thanks for subscribing! You will now be notified about any future events. See you soon!'
            };
            await transporter.sendMail(mailOptions);
        }

        res.json({"message":"subscribed"});

    } else if (!queryResult[0].active) {

        let payload = {
            active: true
        };

        await functions.update(email,payload);

        var mailOptions = {
            from: `Magnify <${gmailUser}>`,
            to: email,
            subject: `Welcome back ${firstName}!`,
            text: 'Thanks for subscribing again! You will be notified about any future events. Hope to see you soon!'
        };

        await transporter.sendMail(mailOptions);

        res.json({"message":"re-subscribed"});

    }

});

api.delete("/email", async (req, res) => {

    let email = req.query.email;
    let id = req.query.id;

    let payload = {
        active: false
    };

    let queryResults = await functions.query(email,["email","id"])
    if (queryResults.length != 0) {
        if (queryResults[0]?.id == id) {
            await functions.update(email,payload);
            res.json({"message":"unsubscribed"});
        };
    };

});

exports.lambdaHandler = async (event, context) => {
    return await api.run(event, context);
};