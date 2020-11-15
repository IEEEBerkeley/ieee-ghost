/**
 * Module dependencies
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const hasha = require('hasha');
const Jimp = require('jimp');

// Connection URL
const url = 'mongodb://localhost:27017';

// Database name
const databaseName = 'imgHashes';

//Source image directory
const srcDir = "./OriginalPhotos";

//Error if Source Directory doesn't exist
if (!fs.existsSync(srcDir)){
    console.error("Source directory does not exist!")
    process.exit(1)
}

//Destination directory
const destDir = "./JPGs";


// connect to mongo
mongoose.connect(url, {
    dbName: databaseName, 
    useNewUrlParser: true, 
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "Connection error:"));

db.once("open", function() {
  console.log("Connection Successful!");
});

// Image schema for name and hash, overwrites default _id
const schema = mongoose.Schema({
    name: String,
    _id: String
  });

//model
let ImgModel = mongoose.model('img', schema, "hashes");

//Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)){
    fs.mkdirSync(destDir);
}

//Read source directory
fs.readdir(srcDir, function (err, files) {
    if (err) {
        console.error("Error reading source directory!", err);
        process.exit(1);
    }

    let promises = [];

    //Iterate through files found
    Promise.all(files.map(function(file) {

        //Make file's source path
        let srcpath = path.join(srcDir, file);

        //Hash image
        return hasha.fromFile(srcpath, {algorithm: 'sha512'}).then(function(hash) {
            
            //Create new model and save
            let im = new ImgModel({name: file, _id: hash});
            im.save()
            
            //Resize and convert images
            return Jimp.read(srcpath).then(image =>{
                //512x512 size
                return Promise.all([image
                    .resize(512, 512) // resize
                    .quality(80) // set JPEG quality
                    .writeAsync("./" + path.join(destDir, hash + " - 512x512.jpg")), // save
                //128x128 size
                image
                    .resize(128, 128) // resize
                    .quality(80) // set JPEG quality
                    .writeAsync("./" + path.join(destDir, hash + " - 128x128.jpg")), // save
                    //32x32 size
                image
                    .resize(32, 32) // resize
                    .quality(80) // set JPEG quality
                    .writeAsync("./" + path.join(destDir, hash + " - 32x32.jpg"))]); // save
            }).catch(err => {
                throw err;
            });
        });
    })).then(function() {process.exit(0)});
});