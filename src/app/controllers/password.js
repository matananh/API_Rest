const express = require('express');
const crypto = require('crypto');
const mailer = require('../../modules/mailer');

const User = require('../models/user');

const router = express.Router();

router.post('/forgot_password', async(req, res) => {
    const {email} = req.body;
    console.log(req.body);

    try {
        const user = await User.findOne({email});

        if (!user)
            return res.status(400).send({error: 'E-mail not found'});

        const token = crypto.randomBytes(20).toString('hex');

        const now = new Date();
        now.setHours(now.getHours() + 1);

        await User.findOneAndUpdate({_id: user.id}, {
            '$set': {
                passwordResetToken: token,
                passwordResetExpires: now,
            }
        });

        console.log(user.id, token, now);

        mailer.sendMail({
            to: email,
            from: 'matananh@gmail.com',
            subject: 'Forgot Password',
            template: 'auth/forgot_password',
            context: { token },
        },(err) => {
            if(err)
                return res.status(400).send({error: 'Cannot send forgot password email'});

            return res.send();
        });
    } catch(err) {
        console.log(err);
        res.status(400).send({error: 'Error on forgot password, try again'});
    }
});

router.post('/reset_password', async(req, res) =>{
    const {email, token, password} = req.body;
    console.log({email, token, password});

    try {
        const user = await User.findOne({email})
            .select('+passwordResetToken passwordResetExpires');

        if(!user)
            return res.status(400).send({error: 'User not found'});

        if(token !== user.passwordResetToken)
            return res.status(400).send({error: 'Token invalid'});

        const now = new Date();

        if(now > user.passwordResetExpires)
            return res.status(400).send({error: 'Token expired, genarate a new one'});

        user.password = password;

        await user.save();

        res.send();
    } catch (err) {
        console.log(err);
        res.status(400).send({error: 'Cannot reset password, try again'});
    }
});

module.exports = app => app.use('/pass', router);
