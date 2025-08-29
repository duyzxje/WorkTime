const mongoose = require('mongoose');

const connectBankingDB = async () => {
    try {
        const conn = await mongoose.createConnection(
            'mongodb+srv://duyzxje2110:Exactly258@banking.gafjm6p.mongodb.net/banking-notifications?retryWrites=true&w=majority&appName=Banking',
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }
        );

        console.log(`MongoDB Banking Connected: ${conn.host}`);
        return conn;
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectBankingDB;
