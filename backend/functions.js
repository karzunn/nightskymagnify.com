const { DynamoDBClient, PutItemCommand, UpdateItemCommand, QueryCommand} = require("@aws-sdk/client-dynamodb");
const { marshall,unmarshall } = require("@aws-sdk/util-dynamodb");
const dynamodb = new DynamoDBClient({region: process.env.REGION});
const tableName = process.env.TABLENAME;

async function query(pk,columns) {

    new_columns = [];
    let KCE = "#pk = :pk";
    let EAN = {"#pk": "email"};
    let EAV = {":pk": {"S":pk}};
    for (let i=0;i<columns.length;i++) {
        EAN[`#${i}`] = columns[i];
        new_columns.push(`#${i}`);
    }

    let queryParams = {
        TableName:tableName,
        KeyConditionExpression: KCE,
        ExpressionAttributeValues: EAV,
        ExpressionAttributeNames: EAN,
        ProjectionExpression: new_columns.join(",")
    }
    
    let queryResult = await dynamodb.send(new QueryCommand(queryParams));
    return queryResult.Items.map(d=>{return unmarshall(d)});

}

exports.query = query;

async function put(payload) {

    let params = {
        TableName: tableName,
        Item: marshall(payload)
    }

    let command = new PutItemCommand(params)
    return await dynamodb.send(command);

}

exports.put = put;

async function update(pk,payload) {

    let keys = Object.keys(payload)

    let UE = [];
    let EAN = {};
    let EAV = {};
    
    for (let i=0;i<keys.length;i++)
    {
        EAN[`#${i}`] = keys[i];
        EAV[`:${i}`] = payload[keys[i]];
        UE.push(`#${i} = :${i}`);
    }
    
    UE = "SET " + UE.join(", ");
    
    let params = {
        TableName: tableName,
        Key: marshall({email:pk}),
        UpdateExpression: UE,
        ExpressionAttributeNames: EAN,
        ExpressionAttributeValues: marshall(EAV),
    }
    
    let command = new UpdateItemCommand(params);
    return await dynamodb.send(command);

}

exports.update = update;