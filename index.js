
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

    getAllPhotos(option) {
        let {is_single_upload} = option;
        return function (input, callback) {
            let { files }   = input;
            let photos      = _.remove(files, function (item) {
                return _.includes(['jpg','png','jpeg','avi','mp4','mkv','mov'],_.lowerCase(path.extname(item)));
            });
            if (photos.length) {
                if (is_single_upload) {
                    console.log(chalk.cyan(`Found photo : `), chalk.green(`'${photos[0]}'`));
                    input.photos      = [{
                        photo         : photos[0],
                        photo_name    : photos[0].replace(/\.[^/.]+$/, "")
                    }]
                } else {
                    input.photos         = _.map(photos, function (photo) {
                        console.log(chalk.cyan(`Found photo : `), chalk.green(`'${photo}'`));
                        return {
                            photo       : photo,
                            photo_name  : photo.replace(/\.[^/.]+$/, "")
                        }
                    });
                }
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
            let {photos} = input;
            let arr = [];
            console.log(chalk.cyan('Posting to facebook...'));
            let url = 'https://graph.facebook.com/v2.10/' + facebook_album_id + '/photos?access_token=' + facebook_long_lived_token;
            _.each(photos, function (item) {
                arr.push(function (callback) {
                    facebook_form_data = _.defaults(facebook_form_data, {
                        type    : "photo",
                        privacy : "{'value':'SELF'}",
                        caption : item.photo_name,
                        source  : fs.createReadStream(`${source_dir}/${item.photo}`)
                    });
                    request.post({
                        url: url,
                        formData: facebook_form_data
                    }, function(err, res, body) {
                        console.log(chalk.green('Posted : ' + item.photo_name));
                        body = JSON.parse(body);
                        callback(body.error, {post_on_facebook_body : body});
                    });
                })
            });

            async.parallel(arr, function (err, result) {
                callback(err, input);
            });
        }
    },



    moveUploadedPhoto(options) {
        let { source_dir, uploaded_dir } = options;
        return function (input, callback) {
            let { photos }  = input;
            let arr         = [];
            _.each(photos, function (item) {
                arr.push(function (callback) {
                    console.log(chalk.cyan(`Moving uploaded file ${item.photo_name}`), chalk.green(`'${uploaded_dir}'`), chalk.cyan(`directory...`));
                    fs.move(`${source_dir}/${item.photo}`, `${uploaded_dir}/${item.photo}`, function(err, result){
                        return callback(err, {move_photo_result : result});
                    });
                })
            });
            async.parallel(arr, function (err, result) {
                callback(err, input);
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
        facebook_form_data          : {},
        is_single_upload            : true
    });

    console.log('\n\n');
    console.log(chalk.magenta.bold('Facebook Auto Upload Photo'));
    console.log(chalk.magenta('Created by Ralph Crisostomo © 2017'));
    console.log('\n\n');

    new CronJob(options.cron, function() {
        console.log('---\n');
        async.waterfall([
            API.getFiles(options),
            API.getAllPhotos(options),
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

