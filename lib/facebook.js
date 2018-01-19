const request         = require('request');
const async           = require('async');
const chalk           = require('chalk');


//
// Ref:
// https://developers.facebook.com/docs/facebook-login/access-tokens/expiration-and-extension
// https://developers.facebook.com/tools/accesstoken/
// https://developers.facebook.com/tools/debug/accesstoken
//

module.exports = function (option) {

    let { facebook_client_id, facebook_client_secret, facebook_redirect_uri } = option;
    return {

        //
        // After login send short live token to generate long live token
        //
        getLongLivedByShortLive(short_lived_token, callback) {
            console.log(chalk.cyan('Getting new facebook short-lived token...'));
            let url = "https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_secret=" + facebook_client_secret + "&client_id=" + facebook_client_id + "&fb_exchange_token=" + short_lived_token;
            request.get(url, function(err, res, body){
                let a = body.split('&');
                let b = a[0].split('=');
                let c = b[1];
                return callback(err,  c );
            });
        },

        //
        // Already have a long live token.
        // Regenerate new long live token.
        //
        getLongLivedByLongLived(long_lived_token, callback) {
            async.waterfall([
                function (callback) {
                    console.log(chalk.cyan('Getting new facebook code...'));
                    let url = "https://graph.facebook.com/oauth/client_code?client_secret=" + facebook_client_secret + "&client_id=" + facebook_client_id + "&redirect_uri=" + facebook_redirect_uri + "&access_token=" + long_lived_token;
                    request.get(url, function(err, res, body){
                        body = JSON.parse(body);
                        callback(body.error, body);
                    });
                },

                function (input, callback) {
                    console.log(chalk.cyan('Getting new facebook long-lived token...'));
                    let url = "https://graph.facebook.com/oauth/access_token?code=" + input.code + "&client_id=" + facebook_client_id + "&redirect_uri=" + facebook_redirect_uri;
                    request(url, function (err, res, body) {
                        body = JSON.parse(body);
                        callback(body.error, body);
                    });
                }


            ], function (err, result) {
                let { access_token } = result;
                callback(err, access_token );
            });
        },


    };
};
