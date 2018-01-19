
//
// PSUEDOCODE | November 4 2017
//
// - User create folder with photos
// - User run facebook-auto-upload
// - Script will read first photo
// - Script will upload photo
// - Script will move photo to _uploaded directory
// - Script will exit after all photos uploaded

'use strict';

const CronJob               = require('cron').CronJob;
const async                 = require('async');
const fs                    = require('fs-extra');
const path                  = require('path');
const _                     = require('lodash');
const chalk                 = require('chalk');
const request               = require('request');
const facebook              = require('./lib/facebook');
const moment                = require('moment');

const API           = {

    getFiles(options) {
        let { source_dir } = options;
        return function (callback) {
            console.log(chalk.cyan(`Date: `), chalk.green(moment().format('MMMM DD, YYYY - hh:mm a')));
            console.log(chalk.cyan(`Reading`, chalk.green(`'${source_dir}'`), `directory...`));
            fs.readdir(source_dir, function(err, result){
                return callback(null, { files : result });
            });
        };
    },

    getFirstPhoto() {
        return function (input, callback) {
            let { files }   = input;
            let photos      = _.remove(files, function (item) {
                return _.includes(['jpg','png'],_.lowerCase(path.extname(item)));
            });
            if (photos.length) {
                input.photo         = photos[0];
                input.photo_name    = photos[0].replace(/\.[^/.]+$/, "");
                console.log(chalk.cyan(`Found photo : `), chalk.green(`'${photos[0]}'`));
                return callback(null, input);
            } else {
                return callback('NO_PHOTOS', null);
            }
        }
    },

    getFacebookLongLivedToken(options) {
        let { facebook_long_lived_token } = options;
        return function (input, callback) {
            facebook(options).getLongLivedByLongLived(facebook_long_lived_token, function (err, result) {
                input.long_lived_token = result;
                return callback(err, input);
            })
        }
    },

    // https://developers.facebook.com/docs/graph-api/reference/v2.10/post
    postOnFacebook(options) {
        let { source_dir, facebook_form_data, facebook_album_id, facebook_long_lived_token } = options;
        return function (input, callback) {
            let { photo, photo_name } = input;
            console.log(chalk.cyan('Posting to facebook...'));
            facebook_form_data = _.defaults(facebook_form_data, {
                type    : "photo",
                privacy : "{'value':'SELF'}",
                caption : photo_name,
                source  : fs.createReadStream(`${source_dir}/${photo}`)
            });

            let url = 'https://graph.facebook.com/v2.10/' + facebook_album_id + '/photos?access_token=' + facebook_long_lived_token;
            request.post({
                url: url,
                formData: facebook_form_data
            }, function(err, res, body) {
                body = JSON.parse(body);
                input.post_on_facebook_body = body;
                callback(body.error, input);
            });
        }

    },

    moveUploadedPhoto(options) {
        let { source_dir, uploaded_dir } = options;
        return function (input, callback) {
            let { photo } = input;
            console.log(chalk.cyan(`Moving uploaded file to`), chalk.green(`'${uploaded_dir}'`), chalk.cyan(`directory...`));
            fs.move(`${source_dir}/${photo}`, `${uploaded_dir}/${photo}`, function(err, result){
                input.move_photo_result = result;
                return callback(err, input);
            });
        }
    }

};



const App =  function (options) {

    options = _.defaults(options, {
        cron                        : '*/1 * * * *',
        source_dir                  : '.',
        uploaded_dir                : '.',
        facebook_client_id          : '',
        facebook_client_secret      : '',
        facebook_redirect_uri       : '',
        facebook_album_id           : '',
        facebook_long_lived_token   : '',
        facebook_form_data          : {}
    });

    console.log('\n\n');
    console.log(chalk.magenta.bold('Facebook Auto Upload Photo'));
    console.log(chalk.magenta('Created by Ralph Crisostomo © 2017'));
    console.log('\n\n');

    new CronJob(options.cron, function() {
        console.log('---\n');
        async.waterfall([
            API.getFiles(options),
            API.getFirstPhoto(),
            API.getFacebookLongLivedToken(options),
            API.postOnFacebook(options),
            API.moveUploadedPhoto(options)
        ], function (err, result) {
            if (err === "NO_PHOTOS") {
                console.log(chalk.red('No more photos to upload.'));
            } else if (err) {
                console.log(chalk.red(JSON.stringify(err, null, 2)));
            } else {
                console.log(chalk.cyan('Upload to facebook complete!'));
            }
            console.log('\n\n');
        });

    }, null, true);
};


module.exports = App;

