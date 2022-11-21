const keys = require("./keys");
const api = require("lambda-api")();
var nodemailer = require('nodemailer');
const { DynamoDBClient, PutItemCommand, UpdateItemCommand} = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const dynamodb = new DynamoDBClient({region: process.env.REGION || "us-east-1"});
const tableName = process.env.TABLENAME || "dev-nightskymagnify-email-list"
const gmailUser = 'nightskymagnify@gmail.com';
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailUser,
        pass: keys.gmailPass
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

    let action = req.body.action;
    let email = req.body.email;
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;

    if (action == "add") {

        let payload = {
            email: email,
            firstName: firstName,
            lastName: lastName,
            active: true
        }
    
        let params = {
            TableName:tableName,
            Item: marshall(payload)
        }
    
        let command = new PutItemCommand(params)
      
        let result = await dynamodb.send(command);

        var mailOptions = {
            from: gmailUser,
            to: email,
            subject: `Hey ${firstName}!`,
            text: 'You will now be notified about any future events! See you soon!'
        };
    
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    
        res.json(result.$metadata);

    }

    else if (action == "remove") {

        let payload = {
            active: false
        }

        let keys = Object.keys(payload)

        let UE = [];
        let EAN = {};
        let EAV = {};
        
        for (let i=0;i<keys.length;i++)
        {
          EAN[`#${i}`] = keys[i];
          EAV[`:${i}`] = payload[keys[i]];
          UE.push(`#${i} = :${i}`)
        }
        
        UE = "SET " + UE.join(", ")
        
        let params = {
          TableName: tableName,
          Key: marshall({email}),
          UpdateExpression: UE,
          ExpressionAttributeNames: EAN,
          ExpressionAttributeValues: marshall(EAV),
        }
        
        let command = new UpdateItemCommand(params)
        let result = await dynamodb.send(command)
        res.json(result.$metadata);

    }

})

exports.lambdaHandler = async (event, context) => {
    let result = await api.run(event, context);
    console.log(result);
    return result;
};