require('dotenv').config()
const express = require('express')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const path = require('path')
const hbs = require('hbs')
const cookieParser = require('cookie-parser')
const Customer = require('./src/models/userSchema')
require('./src/db/conn')
const app = express()
const port = process.env.PORT || 8000

app.use(express.json())
app.use(express.urlencoded({extended : false}))
app.use(cookieParser())

const viewPath = path.join(__dirname, '/templates/views')
const partialsPath = path.join(__dirname, '/templates/partials')

app.use(express.static('public'))

app.set('view engine', 'hbs')
app.set('views', viewPath)
hbs.registerPartials(partialsPath)

app.get('/', (req, res) => {
    res.render('index')
})

app.post('/fun', async (req, res) => {
    try {
        const { username, email, phone, password, cpassword } = req.body
        if(!username || !email || !phone || !password || !cpassword) return res.status(422).json({error : 'All fields are required...'})
        const isEmailMatch = await Customer.findOne({email})
        const isPhoneMatch = await Customer.findOne({phone})
        const isValidate = validator.isEmail(email)
        if(isValidate == false){
            return res.status(422).json({error : 'Enter a valid email'})
        }else if(isEmailMatch || isPhoneMatch){
            return res.status(422).json({error : 'customer already registered!!'})
        }else if(password !== cpassword){
            return res.status(422).json({error : 'passwords are not matching...'})
        }else {
            const customer = new Customer({username, email, phone, password, cpassword})
            let token = await customer.generateAuthToken()
            // console.log(token);  
            await customer.save()
            return res.status(200).render('index')
        }
    } catch (e) {
        return res.status(500).json({error : e})
    }
})

app.post('/run', async (req, res) => {
    try {
        let token
        const { email, password } = req.body
        if(!email || !password) return res.status(422).json({error : 'All fields are required...'})
        const userMatch = await Customer.findOne({email})
        if(!userMatch){
            return res.status(422).json({error : 'User not found!!'})
        }else{
            const passMatch = await bcrypt.compare(password, userMatch.password)
            token = await userMatch.generateAuthToken()
            // console.log(token);

            res.cookie('jwtoken', token, {
                expires : new Date(Date.now() + 60000),
                httpOnly : true
            })
            if(passMatch){
                const id = userMatch._id
                const username = userMatch.username
                const email = userMatch.email
                const phone = userMatch.phone
                return res.status(200).render('user', {
                    id,
                    username,
                    email,
                    phone
                })
            }else return res.status(422).json({error : 'invalid credientials'})
        }
    } catch (e) {
        return res.status(500).json({error : e})
    }
})


app.listen(port, () => {
    console.log(`server listening on port : ${port}`);
})