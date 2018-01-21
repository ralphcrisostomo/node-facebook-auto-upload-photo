# Node Facebook Auto Upload Photo
This is a personal project for facebook auto upload using cron job.

## Install
``` bash

npm install --save https://github.com/ralphcrisostomo/node-facebook-auto-upload-photo

```

### Sample usage
``` javascript

const facebookAutoUploadPhoto = require('facebook-auto-upload-photo');

facebookAutoUploadPhoto({
    cron                        : '*/1 * * * *',
    source_dir                  : './source_dir',
    uploaded_dir                :  './uploaded_dir',
    facebook_client_id          : 'FACEBOOK_CLIENT_ID',
    facebook_client_secret      : 'FACEBOOK_CLIENT_SECRET',
    facebook_redirect_uri       : 'http://www.facebook.com',
    facebook_album_id           : 'FACEBOOK_ALBUM_ID',
    facebook_long_lived_token   : 'FACEBOOK_LONG_LIVED_TOKEN',
    facebook_form_data          : {}
});

```
