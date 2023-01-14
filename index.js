const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb')

const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a0n4p.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, {useNewUrlParser: true,useUnifiedTopology: true,serverApi: ServerApiVersion.v1})

async function run() {

    try{
      const appointmentOptionCollection = client.db('doctorsPortal').collection('appointmentOptions')
      const bookingsCollection = client.db('doctorsPortal').collection('bookings');
          
      ////////
      app.get('/appointmentOptions', async (req, res) => {
        const date = req.query.date;
        const query = {};
        const options = await appointmentOptionCollection.find(query).toArray();

        // getting the bookings of the provided date
        const bookingQuery = { appointmentDate: date }
        const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();

        options.forEach(option => {
            const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
            const bookedSlots = optionBooked.map(book => book.slot);
            const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot))
            option.slots = remainingSlots;
        })
        res.send(options);

      })
    /////////////////
    /*app.get('/v2/appointmentOptions', async (req, res) => {
      const date = req.query.date;
      const options = await appointmentOptionCollection.aggregate([
          {
              $lookup: {
                  from: 'bookings',
                  localField: 'name',
                  foreignField: 'treatment',
                  pipeline: [
                      {
                          $match: {
                              $expr: {
                                  $eq: ['$appointmentDate', date]
                              }
                          }
                      }
                  ],
                  as: 'booked'
              }
          },
          {
              $project: {
                  name: 1,
                  slots: 1,
                  booked: {
                      $map: {
                          input: '$booked',
                          as: 'book',
                          in: '$$book.slot'
                      }
                  }
              }
          },
          {
              $project: {
                  name: 1,
                  slots: {
                      $setDifference: ['$slots', '$booked']
                  }
              }
          }
      ]).toArray();
      res.send(options);
  })
  */
      ////////
      app.post('/bookings', async (req, res) => {
       
        const booking = req.body;
        console.log(booking);
        const query = {
            appointmentDate: booking.appointmentDate,
            email: booking.email,
            treatment: booking.treatment 
        }

        const alreadyBooked = await bookingsCollection.find(query).toArray();

        if (alreadyBooked.length){
            const message = `You already have a booking for,
             ${booking.treatment} on ${booking.appointmentDate} `
            return res.send({acknowledged: false, message})
        }

        const result = await bookingsCollection.insertOne(booking);
        res.send(result);

    })
    

    }
    finally {
    
    }
}

run().catch(console.log)

app.get('/', (req, res) => {
  res.send('Running server')
})

app.listen(port, () => {
  console.log('Running on port', port)
})
