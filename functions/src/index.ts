
import * as functions from  'firebase-functions';

const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.database();
const ref = db.ref("Packages")
const ref_Deliveries = db.ref("Deliveries")
const ref_Deliveries_modification_time = db.ref("Delayed_Deliveries_modification_time");
const ref_DeliveriesDone = db.ref("Deliveries_Done")

const ref_DeliveriesDoneMonthse = db.ref("Deliveries_Done_months")
const ref_Deliveries_per_monts = db.ref("Deliveries_per_monts")
const ref_Deliveries_small_by_days = db.ref("Deliveries_small_by_days")
const Deliveries_Done_Date_modified = db.ref("Deliveries_Done_Date_modified")

var NodeGeocoder = require('node-geocoder');
const ref_DeliveryGuys = db.ref("Delivery_Guys")
const refCostumerReview = db.ref("CostumerReview")
const refCostumerReviewModified = db.ref("CostumerReviewModified")
const ref_DeliveryIndex = db.ref("DeliveryIndex")
const ref_DelayedDeliveries = db.ref("Delayed_Delivery")
const ref_rest = db.ref("Restoraunt")
const Json2csvParser = require('json2csv').Parser;
const express = require('express');
const session = require('express-session');
const app = express();
const path = require('path');
app.set('view engine', 'pug');
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}))
const cron = require("node-cron");
const fs = require("fs");
const dateFormat = require('dateformat');
//const GeoPoint = require('geopoint');
const google_distance = require('google-distance');
google_distance.apiKey = 'AIzaSyBRsUgG1Jssyfe7pGYDJHhHU4viezKhghA';
const accountSid = 'AC09043b94f21a66e0868a32ac2b2b109b';
const authToken = '28a347d108ab1edd057b543fba019716';

import { Expo,ExpoPushMessage,ExpoPushTicket } from 'expo-server-sdk';

const https = require('https');



const firebase = require("firebase/app");
var config = {
    apiKey: "AIzaSyApY_ArxtwaDtxdyogV__a5FCudDgsbs3Y",
    authDomain: "jetpack-f6617.firebaseapp.com",
    databaseURL: "https://jetpack-f6617.firebaseio.com",
    projectId: "jetpack-f6617",
    };
firebase.initializeApp(config);


var NodeGeocoder = require('node-geocoder');

var node_geocoder_options = {
    provider: 'google',
   
    // Optional depending on the providers
    httpAdapter: 'https', // Default
    apiKey: 'AIzaSyBRsUgG1Jssyfe7pGYDJHhHU4viezKhghA', // for Mapquest, OpenCage, Google Premier
    formatter: null         // 'gpx', 'string', ...
  };
  var geocoder = NodeGeocoder(node_geocoder_options);
app.use(express.static(path.join(__dirname, '../views')))


const request2 = require('request'); 




function onDeliveryReady(change,context,area_num)
{
    let ref = area_num == null || area_num == 0 ? "" : area_num + "/"
    return   db.ref(ref + "Deliveries").child(context.params.pushId).once("value").then((snap) => {
        let deliv = snap.val();
        let deliv_guy_index = deliv.delivery_guy_index_assigned;
        if (isNullOrUndefined(deliv_guy_index))
        {
            return ()=>{};
        }
        return db.ref(ref +"Delivery_Guys").child(deliv_guy_index).once("value").then((snap_guy)=>{
            let deliv_guy = snap_guy.val();
            if (deliv_guy.token === undefined || deliv_guy.token === "")
            {
                console.log(' onDeliveryReady token not exist for : ' + deliv_guy.index_string);
                return;
            }
            var registrationToken = deliv_guy.token;
            var message = {
                data : {
                    value: "deliv_ready",
                    deliv_index: deliv.indexString,
                    rest: deliv.business_name,
                    adress: deliv.adressTo,
                },
            
            token: registrationToken
            };  
            return  admin.messaging().send(message)
            .then((res) => {
                // Response is a message ID string.
                console.log('Successfully sent message:', res + " guy: " + deliv_guy.index_string );

            })
            .catch((error) => {
                console.log('Error sending message:', error + " guy: " + deliv_guy.index_string );
            });    
         

        })
    })
}



exports.onDeliveryReady = functions.database.ref('Deliveries/{pushId}/deliv_ready')
.onUpdate((change, context) => {
    return onDeliveryReady(change,context,0);
    });

    exports.onDeliveryReady2 = functions.database.ref('{pushId2}/Deliveries/{pushId}/deliv_ready')
    .onUpdate((change, context) => {
        return onDeliveryReady(change,context,context.params.pushId2);
        });

async function setIndexForNewDelivery(change,context,area_num)
{
    let index;
    let ref = area_num == null || area_num == 0 ? "" : area_num + "/"
    return  ref_DeliveryIndex.transaction(function(current_value) {
          // This code may get re-run multiple times if there are conflicts.
          console.log("setIndexForNewDelivery curr:" + current_value );
          if (current_value === null)
          {
              return current_value;
          }
          else{
              
            process.env.TZ = 'Asia/Jerusalem' 
            let hours_min = dateFormat(new Date().toLocaleString(),"HH:MM");
              console.log("setIndexForNewDelivery curr:" + current_value.current.current + " aa: " + context.params.pushId);
              index = parseInt(current_value.current.current);

              db.ref(ref + "DeliveriesKeys").child(context.params.pushId).set({
                "key": String(context.params.pushId)
            })
              db.ref(ref + "Deliveries").child(context.params.pushId).update({
              "indexString" : String(index),
              "index" : index,
              "key" : String(context.params.pushId),
              "timeInserted" : hours_min,
              
          }).catch(e =>{
              console.error("error on setIndexForNewDelivery " + context.params.pushId + " " + e)
          });
          current_value.current.current++;
              return  current_value;
          }
         
 
      },function(error, committed, snapshot) {
        if(error || !committed) 
        {  
            setIndexForNewDelivery(change,context,area_num);
        } 
        else {
            db.ref(ref + "Temp").transaction(function(current_value2) {
                if (current_value2 === null)
                {
                    return current_value2;
                }
                else{
                    current_value2.amount_deliv++;
                    return current_value2;
                }
            })
        }
       
        
    })
     
}

exports.setIndexForNewDelivery = functions.database.ref('Deliveries/{pushId}/indexString')
        .onCreate((change, context) => {
          return   setIndexForNewDelivery(change,context,0)
    });
    exports.setIndexForNewDelivery2 = functions.database.ref('{pushId2}/Deliveries/{pushId}/indexString')
        .onCreate((change, context) => {
          return  setIndexForNewDelivery(change,context,context.params.pushId2)
    });

    exports.error = functions.https.onRequest((request, res) => {
        console.error("errors err: " + request.body.error); 
        console.error("errors guy: " + JSON.stringify(request.body.guy)); 
        console.error("errors deliv:  " + JSON.stringify(request.body.deliv) ); 
        console.error("errors dest:  " + JSON.stringify(request.body.dests) ); 
        res.status(200).send();
        return null;
    })
 

let morden_bar_key = "-M-tIaZPAGM2yqyVwUbP"
exports.add_delivery = functions.https.onRequest((req, res) => {
    res.status(200).send();
  //  console.log(" add_delivery status " + req.body.status);
    console.log(" add_delivery " + JSON.stringify(req.body));
    if (req.body.status !== "processing")
    {
        console.error(" add_delivery wrond status:  " + req.body.status);
        return;
    }
    if (isNullOrUndefined(req.body.shipping_total)  ||  req.body.shipping_total === "0" )
    {
        console.error(" add_delivery wrond shipping_total:  " + req.body.shipping_total);
        return;
    }
    else{
        console.log(" add_delivery good shipping_total:  " + req.body.shipping_total);
    }
    if (!isNullOrUndefined(req.body.meta_data)  &&  !isNullOrUndefined(req.body.meta_data[6]) && !isNullOrUndefined(req.body.meta_data[6].value) && !isNullOrUndefined(req.body.meta_data[6].value.code))
    {
        if (req.body.meta_data[6].value.code !== 200 &&  req.body.meta_data[6].value.code !== "200" )
        {
            console.error(" add_delivery wrond code:  " + req.body.meta_data[6].value.code);
            return;
        }
        
    }
    
 //   console.log(" add_delivery " + Object.keys(req.body) );
    ref_rest.child(morden_bar_key).once("value").then(snap =>{
        let rest = snap.val();
        return rest;
    }).then((rest)=>{
        console.log("found rest: " + rest.name)
        console.log(req.body.shipping)
        console.log(req.body.billing)
        if (isNullOrUndefined(req.body.shipping))
        {
            return;
        }
       // console.log(req.body.shipping.address_1);
        let adress = req.body.shipping.address_1;
        
        let adress_full = adress + " " + req.body.shipping.city;
        console.log( " חיפוש עבור: " + adress_full);
        var building = adress.replace(/\D/g, "");
        building = isNullOrUndefined(building)?"":building;
        var apartment = req.body.shipping.address_2.replace(/\D/g, "");
        apartment = isNullOrUndefined(apartment)?"":apartment;
        var street = req.body.shipping.address_1.replace(/[0-9]/g, '');
        street = isNullOrUndefined(street)?"":street;
        var city = req.body.shipping.city;
        city = isNullOrUndefined(city)?"":city;
     
        var comment = isNullOrUndefined(req.body.shipping.customer_note) ? "" : req.body.shipping.customer_note;
        var name =  req.body.shipping.first_name + " " + req.body.shipping.last_name;
       
        var phone =req.body.billing.phone;
        phone = isNullOrUndefined(phone)?"":phone;
        var price = isNullOrUndefined(req.body.total)?"": req.body.total ;

        geocoder.geocode(adress_full).then(function(res) {
         //   rest,street,building,apartment,city,comment,costumer_name,phone,lat,long,price)
        //  console.log(res); console.log(res[0].latitude);console.log(Object.keys(res[0]));
            let delivery = create_delivery(rest,street,building,apartment,city,comment,name,phone,res[0].latitude,res[0].longitude,price);
            console.log(delivery);
            ref_Deliveries.push(delivery);
          })




     
       // }
       return rest;
    })
   
  });



  exports.add_delivery_all = functions.https.onRequest((req, res) => {
    console.log(" add_delivery all " + JSON.stringify(req.body));
    res.status(200).send();
  //  console.log(" add_delivery status " + req.body.status);
   
//     if (req.body.status !== "processing")
//     {
//         console.error(" add_delivery wrond status:  " + req.body.status);
//         return;
//     }
//     if (isNullOrUndefined(req.body.shipping_total)  ||  req.body.shipping_total === "0" )
//     {
//         console.error(" add_delivery wrond shipping_total:  " + req.body.shipping_total);
//         return;
//     }
//     else{
//         console.log(" add_delivery good shipping_total:  " + req.body.shipping_total);
//     }
//     if (!isNullOrUndefined(req.body.meta_data)  &&  !isNullOrUndefined(req.body.meta_data[6]) && !isNullOrUndefined(req.body.meta_data[6].value) && !isNullOrUndefined(req.body.meta_data[6].value.code))
//     {
//         if (req.body.meta_data[6].value.code !== 200 &&  req.body.meta_data[6].value.code !== "200" )
//         {
//             console.error(" add_delivery wrond code:  " + req.body.meta_data[6].value.code);
//             return;
//         }
        
//     }
    
//  //   console.log(" add_delivery " + Object.keys(req.body) );
//     ref_rest.child(morden_bar_key).once("value").then(snap =>{
//         let rest = snap.val();
//         return rest;
//     }).then((rest)=>{
//         console.log("found rest: " + rest.name)
//         console.log(req.body.shipping)
//         console.log(req.body.billing)
//         if (isNullOrUndefined(req.body.shipping))
//         {
//             return;
//         }
//        // console.log(req.body.shipping.address_1);
//         let adress = req.body.shipping.address_1;
        
//         let adress_full = adress + " " + req.body.shipping.city;
//         console.log( " חיפוש עבור: " + adress_full);
//         var building = adress.replace(/\D/g, "");
//         building = isNullOrUndefined(building)?"":building;
//         var apartment = req.body.shipping.address_2.replace(/\D/g, "");
//         apartment = isNullOrUndefined(apartment)?"":apartment;
//         var street = req.body.shipping.address_1.replace(/[0-9]/g, '');
//         street = isNullOrUndefined(street)?"":street;
//         var city = req.body.shipping.city;
//         city = isNullOrUndefined(city)?"":city;
     
//         var comment = isNullOrUndefined(req.body.shipping.customer_note) ? "" : req.body.shipping.customer_note;
//         var name =  req.body.shipping.first_name + " " + req.body.shipping.last_name;
       
//         var phone =req.body.billing.phone;
//         phone = isNullOrUndefined(phone)?"":phone;
//         var price = isNullOrUndefined(req.body.total)?"": req.body.total ;

//         geocoder.geocode(adress_full).then(function(res) {
//          //   rest,street,building,apartment,city,comment,costumer_name,phone,lat,long,price)
//         //  console.log(res); console.log(res[0].latitude);console.log(Object.keys(res[0]));
//             let delivery = create_delivery(rest,street,building,apartment,city,comment,name,phone,res[0].latitude,res[0].longitude,price);
//             console.log(delivery);
//             ref_Deliveries.push(delivery);
//           })




     
//        // }
//        return rest;
//     })
   
  });




  function setCoordinatesIfNeeded(change,context,area_num)
  {
    console.log("setCoordinatesIfNeeded index: " +  context.params.pushId);
    let ref = area_num == null || area_num == 0 ? "" : area_num + "/"
    return  db.ref(ref + "Deliveries").child(context.params.pushId).transaction(function(deliv) {
 
            if (deliv === null )
            {
                // console.log("setCoordinatesIfNeeded null");
                return deliv;
            }
            else 
            {
               
            //wrong cords
                if ((deliv.dest_cord_lat === 31.890267 || deliv.dest_cord_lat === 31.8903 ) && (deliv.dest_cord_long === 35.0104 || deliv.dest_cord_long === 35.010397 ))
                {

                    console.log("setCoordinatesIfNeeded wrong cords for " + deliv.indexString + " " + deliv.adressTo);
                    let adress_fixed_arr = deliv.adressTo.split("/");
                    console.log("setCoordinatesIfNeeded wrong cords fixed adres for " + deliv.indexString + " " + adress_fixed_arr[0]);
                    geocoder.geocode(adress_fixed_arr[0], function(err, res) 
                    {
                    if (err)
                    {
                        console.log("error on set coordinates: " + err.message  + " " + deliv.adressTo)
                    }
                    else
                    {
                        if (("0" in  res) && ("latitude" in res[0]))
                        {
                            console.log("setCoordinatesIfNeeded new1 cords: " + res + " " +  res[0].latitude + " " + res[0].longitude);
                            deliv.dest_cord_lat =  res[0].latitude;
                            deliv.dest_cord_long = res[0].longitude;
                            db.ref(ref + "Deliveries").child(context.params.pushId).update({
                                "dest_cord_lat" : res[0].latitude,
                                "dest_cord_long" : res[0].longitude,
                            });
                
                        }
                        else{
                            console.log("setCoordinatesIfNeeded some error cords: " + res + " " +  res[0] + " "  + Object.keys(res));
                        }
                        
                    }
                    });
                }
                else if (deliv.indexString !== "-1")
                {
                    console.log("setCoordinatesIfNeeded cords ok for " + deliv.indexString);  
                }
                return deliv;
            }
      
      
        
            
    }).then();
  }


    exports.setCoordinatesIfNeeded = functions.database.ref('Deliveries/{pushId}/indexString')
        .onCreate((change, context) => {
   setCoordinatesIfNeeded(change,context,0)
                      
    });
    
    exports.setCoordinatesIfNeeded2 = functions.database.ref('{pushId2}/Deliveries/{pushId}/indexString')
    .onCreate((change, context) => {
setCoordinatesIfNeeded(change,context,context.params.pushId2)
                  
});
     


 
    
   

        exports.setKeyForNewRest = functions.database.ref('Restoraunt/{pushId}/key')
    .onCreate((change, context) => {
       
      return  ref_rest.child(context.params.pushId).update({
                "key" : String(context.params.pushId)
            })
        });

function setStatusCPromise(key,time_late,was_late,area_num)
{
    let ref = area_num == null || area_num == 0 ? "" : area_num + "/"
    return db.ref(ref + "Deliveries").child(key).transaction(function(deliv) {
        // This code may get re-run multiple times if there are conflicts.
       
        if (deliv === null)
        {
            console.log("status C4");
            return deliv;
        }
        else
        {
            console.log("status C " + deliv.indexString + " " + deliv.status + ' ' + deliv.timeTaken);
            if (deliv.status === "D" )
            {
              //  console.log("status C2");
                return deliv;
            }
             else if (deliv.status === "B" || deliv.timeTaken != (""))
            {
                //console.log("status C");
                deliv.time_late_by_rest = time_late;
                deliv.was_late_restoraunt = was_late;
                deliv.status = "C";
            }
            
            return  deliv;
        }
       

    });
}

function sendSMSStatusC(rest_key,costumer_phone,deliv_key,area_num)
{
    return   ref_rest.child(rest_key).once("value").then(snap2 =>  {
        console.log("inside ref_rest query " + snap2.key);
                if (snap2.val().feature1)
                {
                    let area_prefix = area_num == null || area_num == 0 ? "" : area_num + "/"
                    let isral_cost_phone = get_israel_phone_to_sms(costumer_phone);
                    let mes = '%20%D7%9C%D7%A7%D7%95%D7%97%20%D7%99%D7%A7%D7%A8%2C%20%D7%94%D7%A9%D7%9C%D7%99%D7%97%20%D7%91%D7%93%D7%A8%D7%9A%20%D7%90%D7%9C%D7%99%D7%9B%D7%9D%2C%20%D7%A0%D7%99%D7%AA%D7%9F%20%D7%9C%D7%A2%D7%A7%D7%95%D7%91%20%D7%90%D7%97%D7%A8%D7%99%D7%95%20%D7%91%D7%A7%D7%99%D7%A9%D7%95%D7%A8%3A%0Ahttps%3A%2F%2Fjetpack-delivery.tk/' + 
                    area_prefix +'deliveries/'
                        mes += deliv_key;
                        console.log("SMS C " + mes + " " + area_prefix + " " + area_num)
                    var  url = 'https://www.micropay.co.il/ExtApi/ScheduleSms.php?get=1&token=1cGI064141ca3f5ade252da8169d1cfa628b&msg='+mes+'&list=' +String(isral_cost_phone)+'&from=jetpack'
                  
                    https.get(url, (resp) => {
                        let data = '';
                      
                        // A chunk of data has been recieved.
                        resp.on('data', (chunk) => {
                          data += chunk;
                        });
                      
                        // The whole response has been received. Print out the result.
                        resp.on('end', () => {
                          console.log(JSON.parse(data).explanation);
                        });
                      
                      }).on("error", (err) => {
                        console.log("Error: " + err.message);
                      });
                   

                }
            
        })
}

function setStatus(change, context,area_num)
{
    let ref = area_num == null || area_num == 0 ? "" : area_num + "/"
    return   db.ref(ref +"Deliveries").child(context.params.pushId).once("value").then(snap =>{
        if (snap.val() != null && (snap.val().timeTaken != ("")))
            {
            
               

              let was_late = false;
              let time_late = "0";
              try{
                  process.env.TZ = 'Asia/Jerusalem' ;
               //in min
                  let diff_from_inserted = get_diff_2(snap.val().timeInserted,snap.val().timeTaken,snap.val().date);
                  let diff_arrived_restoraunt = get_diff_2(snap.val().timeArriveToRestoraunt,snap.val().timeTaken,snap.val().date);
                  let time_prep = parseInt(snap.val().prepare_time);
                  let diff_Arrived = diff_from_inserted - diff_arrived_restoraunt;
                //  console.log("here:  diff_inserted" + diff_from_inserted + " diff_arrived_restoraunt:" + diff_arrived_restoraunt + " time_prep:" + time_prep + " diff_Arrived" + diff_Arrived);
                  if (diff_Arrived > time_prep)
                  {
                    if (diff_arrived_restoraunt >  5)
                    {
                        was_late = true;
                        time_late = String(diff_arrived_restoraunt)
                    }
                  }
                  else{
                    if (diff_from_inserted > time_prep + 5)
                    {
                        was_late = true;
                        time_late = String(diff_from_inserted - time_prep)
                    }

                  }
              }
              catch(err){
                  console.log("error on check late " + err);
              }
               
             //   console.log("aaaaa   " );
              return setStatusCPromise(context.params.pushId,time_late,was_late,area_num)
              .then(()=>{
                    try{
                        return sendSMSStatusC(snap.val().restoraunt_key,snap.val().costumer_phone,snap.val().key,area_num);
                    }
                    catch (err)
                    {
                        console.log("error on SMS failuere " + err );
                    }
                    
              })
            .catch(err => {
                console.log('Transaction failure:', err);
                return  setStatusCPromise(context.params.pushId,time_late,was_late,area_num)
            });
            

            

        }

    });
}

exports.setStatus = functions.database.ref('Deliveries/{pushId}/timeTaken')
.onUpdate((change, context) => {
   // console.log("on time taken key:" + context.params.pushId);
 return  setStatus(change,context,0)
  

});
exports.setStatus_2 = functions.database.ref('{pushId2}/Deliveries/{pushId}/timeTaken')
.onUpdate((change, context) => {
   // console.log("on time taken key:" + context.params.pushId);
  return setStatus(change,context,context.params.pushId2)
});


function get_israel_phone_to_sms(phone)
{
    return phone.replace(new RegExp('^' + phone[0]), "+972");
}
function unlock(area_num)
{
    let ref = area_num == null || area_num == 0 ? "" : area_num + "/"
    console.log("rrrrr lock ")
    setTimeout(()=>{
        db.ref(ref +"Temp").transaction(function(temp) {
            if (temp === null)
            {
                return temp;
            }
            else
            {
                console.log("rrrrr lock make false " + temp.lock)
                temp.lock = false;
                temp.lock_calculate = false;
                return temp;
            }

        });
    }, 20000)
}

exports.Unlock = functions.database.ref('Temp/lock')
.onUpdate((change, context) => {
   return unlock(0)
      
    });
    exports.Unlock2 = functions.database.ref('{pushId2}/Temp/lock')
.onUpdate((change, context) => {
  return  unlock(context.params.pushId2)
      
    });

function setStatus2(change, context,area_num)
{
    let ref = area_num == null || area_num == 0 ? "" : area_num + "/"
    if (String(change.after.val())  === "")
    {
        console.log("on time delivery_guy_index_assigned if " + change.after.val() + " before: " + change.before.val());
        return () => { console.log("ff");}
    }
    else{
      //  console.log("on time delivery_guy_index_assigned  eelse   " + change.after.val() + " before: " + change.before.val());
        process.env.TZ = 'Asia/Jerusalem' 
      
        let hours_min = dateFormat(new Date().toLocaleString(),"HH:MM");
            return  db.ref(ref + "Deliveries").child(context.params.pushId).transaction(function(deliv) {
                    if (deliv === null)
                    {
                        return deliv;
                    }
                    else
                    {

                        if (deliv.time_assigned == null || deliv.time_assigned === "")
                        {
                            deliv.time_assigned = hours_min;
                        }
                        console.log("set status B " + deliv.deliv_guy_name + " " + deliv.indexString);
                        deliv.status = "B";
                        return  deliv;
                    }
                
            
                });
    }
}

exports.setStatus2 = functions.database.ref('Deliveries/{pushId}/delivery_guy_index_assigned')
.onUpdate((change, context) => {
    return setStatus2(change,context,0)

    });
    exports.setStatus22 = functions.database.ref('{pushId2}/Deliveries/{pushId}/delivery_guy_index_assigned')
.onUpdate((change, context) => {
    return setStatus2(change,context,context.params.pushId2)

    });

    function get_diff_2(time_str,time_str2,date_str)
    {
        let date_now =  new Date();
    
        
        let date_inserted_parts = date_str.split('-');
        let time_inserted_parts = time_str.split(':');
        let time_inserted_parts2 = time_str2.split(':');
        let date_inserted = new Date(date_inserted_parts[0],date_inserted_parts[1] -1 ,date_inserted_parts[2],time_inserted_parts[0],time_inserted_parts[1]);
        let date_inserted2 = new Date(date_inserted_parts[0],date_inserted_parts[1] -1 ,date_inserted_parts[2],time_inserted_parts2[0],time_inserted_parts2[1]);
      //  console.log(" date inserted1: " + date_inserted);
      //  console.log(" date inserted2: " + date_inserted2);

       let temp = (date_inserted2.getTime() - date_inserted.getTime())/(60*1000);
       return Math.floor(temp);
    }

function setOnDeliveryAssigned(change,context,area_num)
{
    let ref = area_num == null || area_num == 0 ? "" : area_num + "/"
    let update_db  = false;
    return  db.ref(ref +"Delivery_Guys").child(context.params.indexString).transaction(function(deliv_guy) {
        
         if (deliv_guy === null)
         {
             console.log("setOnDeliveryAssigned is null ");
             return deliv_guy;
         }
         else
         {
             console.log("setOnDeliveryAssigned correct");
             update_db = deliv_guy.update_db;
             deliv_guy.update_db = false;
         
             return deliv_guy;
         }

     }).then(result => {
         console.log('Transaction success!' );
         let deliv_guy = result.snapshot.val();
         if ( update_db === false)
         {
             return;
         }
         if (!isNullOrUndefined(deliv_guy.ios_token) && deliv_guy.ios_token !== "")
         {
             console.log(" fff0 " + deliv_guy.ios_token)
             let expo = new Expo();
             let message : ExpoPushMessage = {
                 to: deliv_guy.ios_token,
                 sound: 'default',
                 body: 'שים לב ייתכן כי מסלולך השתנה',
                 data: { withSome: 'data' },
             }
             let messages : ExpoPushMessage[] = [];
             console.log(" fff1 " + message.to + " " + Object.keys(message))
             messages.push(message);
             console.log(" fff2 " + messages[0].to)
             // The Expo push notification service accepts batches of notifications so
             // that you don't need to send 1000 requests to send 1000 notifications. We
             // recommend you batch your notifications to reduce the number of requests
             // and to compress them (notifications with similar content will get
             // compressed).
             let chunks = expo.chunkPushNotifications(messages);
             let tickets : ExpoPushTicket[] = [];
             (async () => {
               // Send the chunks to the Expo push notification service. There are
               // different strategies you could use. A simple one is to send one chunk at a
               // time, which nicely spreads the load out over time:
               for (let chunk of chunks) {
                 try {
                   let ticketChunk : ExpoPushTicket[]= await expo.sendPushNotificationsAsync(chunk);
                   tickets.push(...ticketChunk);
                   // NOTE: If a ticket contains an error code in ticket.details.error, you
                   // must handle it appropriately. The error codes are listed in the Expo
                   // documentation:
                   // https://docs.expo.io/versions/latest/guides/push-notifications#response-format
                 } catch (error) {
                   console.error(error);
                 }
               }
             })();
         }
         if (deliv_guy.token === undefined || deliv_guy.token === "" )
             {
                 console.log('token not exist for : ' + deliv_guy.index_string);
                 return;
             }
                  var registrationToken = deliv_guy.token;
                 var message = {
                     data : {
                         value: "123"
                     },
                 
                 token: registrationToken
                 };  
                 return  admin.messaging().send(message)
                 .then((res) => {
                     // Response is a message ID string.
                     console.log('Successfully sent message:', res + " guy: " + deliv_guy.index_string );

                 })
                 .catch((error) => {
                     console.log('Error sending message:', error + " guy: " + deliv_guy.index_string );
                 });    
       }).catch(err => {
         console.log('Transaction failure:', err);
       });
}

exports.setOnDeliveryAssigned = functions.database.ref('Delivery_Guys/{indexString}/update_db')
.onUpdate((change,context) => {
    setOnDeliveryAssigned(change,context,0) 

});
exports.setOnDeliveryAssigned2 = functions.database.ref('{pushId2}/Delivery_Guys/{indexString}/update_db')
.onUpdate((change,context) => {
    setOnDeliveryAssigned(change,context,context.params.pushId2) 

});

                      
function setStatusDPromise(key,was_late,time_late,area_num)
{
    console.log("status D setStatusDPromise "  + " " + key);
    let ref = area_num == null || area_num == 0 ? "" : area_num + "/"
        return   db.ref(ref + "Deliveries").child(key).transaction(function(deliv) {
            // This code may get re-run multiple times if there are conflicts.
            console.log("status D " + deliv + " " + key);
            if (deliv === null)
            {
              //  console.log("status D2 " + deliv);
                return deliv;
            }
            else
            {
                console.log("status D succeded " + deliv.indexString + " " + deliv.deliveryGuyName + " " + deliv.delivery_guy_index_assigned);
                deliv.status = "D";
                deliv.was_late_deliveries = was_late;
                deliv.time_late_by_deliveries = time_late;
                return  deliv;
               
            }
           
        }) .then(deliv => {
            if (deliv !== undefined && deliv !== 1)
            {
            var deliv_sent = deliv.snapshot.val();
           // console.log('Transaction status D success:' + deliv_sent.indexString + " key " + deliv_sent.key);
            var temp_Arr = deliv_sent.date.split("-");
            try{
                var temp = parseInt(temp_Arr[1]);
            }
            catch (e)
            {
                temp = 0;
            }
            var month = String(temp);

            db.ref(ref +"Deliveries_Done_months").child(month).child("val").transaction(function(current_value) {
             return (current_value || 0) + 1;
            });
           let year_month_index = temp_Arr[0] + "-" + temp_Arr[1];
           db.ref(ref + "Deliveries_per_monts").child(year_month_index).child("amount").transaction(function(val){
            return (val || 0) + 1;
           })
           db.ref(ref + "Deliveries_per_monts").child(year_month_index).child("Deliveries").child(deliv_sent.restoraunt_key).child("amount").transaction(function(val){
            return (val || 0) + 1;
           })
           let small_Deliv = {
            indexString: deliv_sent.indexString,
            adressTo: deliv_sent.adressTo,
            timeTaken : deliv_sent.timeTaken,
            timeDeliver: deliv_sent.timeDeliver,
            costumerName : deliv_sent.costumerName,
            business_name: deliv_sent.business_name,
            deliveryGuyName: deliv_sent.deliveryGuyName,
            date: deliv_sent.date,
            key: deliv_sent.key,
            restoraunt_key: deliv_sent.restoraunt_key
           }
           db.ref(ref + "Deliveries_per_monts").child(year_month_index).child("Deliveries").child(deliv_sent.restoraunt_key).child(deliv_sent.date).child(key).set(small_Deliv);
           db.ref(ref + "Deliveries_per_monts").child("options").child(year_month_index).set(String(year_month_index));
           db.ref(ref + "Deliveries_small_by_days").child(deliv_sent.date).child(key).set(small_Deliv);
            return db.ref(ref +"Deliveries_Done_Date_modified").child(deliv_sent.date).child(key).set(deliv_sent).then(() =>{
             
                db.ref(ref + "DeliveriesKeys").child(key).remove();
                     setTimeout(() => {  }, 20000);
                     return  db.ref(ref +"Deliveries").child(key).transaction(function(deliv){
                         if (deliv == null)
                         {
                             return deliv;
                         }
                         else{
                            return null;
                         }
                     }).then(()=>{
                        db.ref(ref + "Temp").transaction(function(current_value2) {
                            if (current_value2 === null)
                            {
                                return current_value2;
                            }
                            else{
                                current_value2.amount_deliv_completed++;
                                return current_value2;
                            }
                        })
                     })
                   // return  db.ref(ref +"Deliveries").child(key).remove();
                });
            }
            else{
            console.log('undef:' + deliv );
            }
            
        });
}
function sendSmsStatusD(rest_key,costumer_phone,deliv_key,date,area_num)
{
        return     ref_rest.child(rest_key).once("value")
        .then(snap2 =>  {
                if (snap2.val().feature2)
                {
                    let area_prefix =  area_num == null || area_num == 0 ? "" : area_num + "/"
                    let isral_cost_phone = get_israel_phone_to_sms(costumer_phone);
                    console.log("ff date123: " + date)
                    let mes = '%D7%9C%D7%A7%D7%95%D7%97%20%D7%99%D7%A7%D7%A8%2C%20%D7%90%D7%A9%D7%9E%D7%97%20%D7%90%D7%9D%20%D7%AA%D7%A2%D7%A0%D7%95%20%D7%A2%D7%9C%20%D7%A9%D7%90%D7%9C%D7%95%D7%9F%20%D7%A7%D7%A6%D7%A8%20%D7%A2%D7%9C%20%D7%9E%D7%A0%D7%AA%20%D7%A9%D7%A0%D7%95%D7%9B%D7%9C%20%D7%9C%D7%94%D7%A9%D7%AA%D7%A4%D7%A8%3A%0Ahttps%3A%2F%2Fjetpack-delivery.tk/'   
                    mes +=   area_prefix + 'costumers_survey%2F' 
                    mes += date + "/"
                    mes += deliv_key;
                    console.log("SMS D " + mes + " " + area_prefix + " " + area_num)
                    var  url = 'https://www.micropay.co.il/ExtApi/ScheduleSms.php?get=1&token=1cGI064141ca3f5ade252da8169d1cfa628b&msg='+mes+'&list=' +String(isral_cost_phone)+'&from=jetpack'
                  
                    https.get(url, (resp) => {
                        let data = '';
                      
                        // A chunk of data has been recieved.
                        resp.on('data', (chunk) => {
                          data += chunk;
                        });
                      
                        // The whole response has been received. Print out the result.
                        resp.on('end', () => {
                          console.log(JSON.parse(data).explanation);
                        });
                      
                      }).on("error", (err) => {
                        console.log("Error: " + err.message);
                      });
                   
                  
                }
    
        })  .catch(err => {
            console.log("err on sms sending: " + err);
        })
}

function status3(change, context,area_num)
{
    console.log("on time timeDeliver key:" + context.params.pushId);
    let ref = area_num == null || area_num == 0 ? "" : area_num + "/"
    return db.ref(ref + "Deliveries").child(context.params.pushId).once("value").then(snap =>{
        console.log("on time timeDeliver inside snap key:" + context.params.pushId);
        if (snap.val() != null && (snap.val().timeDeliver === ("gas")))
        {
            return    db.ref(ref + "Deliveries").child(context.params.pushId).remove();
        }
        if (snap.val() != null && (snap.val().timeDeliver != ("")))
            {
                console.log("on time timeDeliver inside first if snap key:" + context.params.pushId);
               
                
                let was_late = false;
                let time_late = "0";
                try{
                    process.env.TZ = 'Asia/Jerusalem' ;
                    let diff_late_deliveries = get_diff_2(snap.val().timeInserted,snap.val().timeDeliver,snap.val().date);
                  
    
                    if (snap.val().time_max_to_costumer != null && diff_late_deliveries > snap.val().time_max_to_costumer)
                    {
                       was_late = true;
                        time_late = String(diff_late_deliveries - snap.val().time_max_to_costumer)
                    }
                }
                catch(err){
                    console.log("error on check late  " + err + " " +  context.params.pushId);
                }
              
                
                console.log("on time timeDeliver before status D promise key:" + context.params.pushId);
              return  setStatusDPromise(context.params.pushId,was_late,time_late,area_num)
                .then(()=>{  
                    try{
                        return sendSmsStatusD(snap.val().restoraunt_key,snap.val().costumer_phone,snap.val().key,snap.val().date,area_num)
                    }   
                        
                    catch(err)  {
                        console.log('Transaction  SMS failure:', err);
                    };
                    
                }).catch(err => {
                    console.log('Transaction failure:', err + " retrying");
                    return  setStatusDPromise(context.params.pushId,was_late,time_late,area_num)
                })
                
             
                
               
            }
            else{
                console.log("on time timeDeliver inside else key:" + context.params.pushId); 
            }

     }).catch(e=>
    {
        console.log("on time timeDeliver inside error catch key:" + context.params.pushId + " " + e.message); 
    })
}
exports.setStatus3 = functions.database.ref('Deliveries/{pushId}/timeDeliver')
.onUpdate((change, context) => {
    status3(change, context,0)
            
    });

    exports.setStatus32 = functions.database.ref('{pushId2}/Deliveries/{pushId}/timeDeliver')
.onUpdate((change, context) => {
    status3(change, context,context.params.pushId2)

    });

   
    

app.use('/package/:param',function (req, res, next) {
    ref.orderByKey().equalTo(req.params.param).once("value", function(snapshot) {
    if (snapshot.exists())
    {
        snapshot.forEach((child) => {
            console.log(child.key, child.val()); 
        //   res.send(child.val() + " " + req.params.param);
        res.val = child.val();
        res.key = child.key;
            next();
        //send sms 
        });
    }
    else
    {
        res.val = null;
        console.log("not find package"); 
        next();
    }
  });

});


function get_from_db(req,res,next)
{
     console.log("get_from_db"); 
     console.log(res.val); 
     
try{
     if (res.val == null)
     {
        console.log("a"); 
       // res.sendFile('f.html', { root: path.join(__dirname, '../app') });
       res.render('package_not_found');
     }
     else if (res.val.time_was_arranged == true)
    {
        console.log("b"); 
       // res.sendFile('index.html', { root: path.join(__dirname, '../app') });
        res.render('package_scheduled');
    }
    else
    {
        res.render('index',{date: res.val.date,id: res.key});
    }
     }
     catch (error) {
                 console.log("/functions/src/fff");
     }

}

app.post('/update',function (req, res, next){
    console.log("update " + req.body.ic); 
    console.log(req.body.r); 
    var time_of_package;
    switch (req.body.r)
    {
         case '1':
         time_of_package = "10:00"
         break;
         case '2':
         time_of_package = "11:00"
         break;
         case '3':
         time_of_package = "12:00"
         break;
         case '4':
         time_of_package = "13:00"
         break;
         case '5':
         time_of_package = "14:00"
         break;
         case '6':
         time_of_package = "15:00"
         break;
         case '7':
         time_of_package = "16:00"
         break;
         case '8':
         time_of_package = "17:00"
         break;
    }
    res.render('package_scheduled');
   const obj =  ref.child(req.body.ic);
   obj.update({
       "time_was_arranged" : true,
       "time_expected" : time_of_package
   });

});

app.get('/package/:param',get_from_db);

let refs = ["" , "1/" , "2/" ,"3/" , "4/"]
app.get('/cronJobDelayedDelivery',(req,res)=>{
    console.log("cronJobDelayedDelivery");
    res.send("fff");
    process.env.TZ = 'Asia/Jerusalem' 
    let date =  dateFormat(new Date().toLocaleString(),"yyyy-mm-dd");
    let hours_min = dateFormat(new Date().toLocaleString(),"HH:MM")
    let hour = hours_min.split(":")[0];
//    console.log("hours_min4: " +hours_min + " hours:" + hour);
refs.forEach(ref_temp => {
    console.log("cronJobDelayedDelivery checking " + ref_temp);
    db.ref(ref_temp + "Delayed_Delivery").once("value")
    .then(snap => {
        console.log("cronjob found0 " + ref_temp + " " + snap.length);
        snap.forEach((c) => {
            let delayed_date = c.val().delayed_date;
            let compare = delayed_date.localeCompare(date);
            console.log("cronjob found " + ref_temp + " " + c.key);
            //its same date
            if (compare == 0)
            {
                console.log("same date:" + date);
                let delayed_hour_min = c.val().delayed_hour;
                let delayed_hour = delayed_hour_min.split(":")[0];
             //   console.log("cronJobDelayedDelivery delayed: " + parseInt(delayed_hour) + " normal: " + parseInt(hour));
                if (parseInt(delayed_hour) - parseInt(hour)  < 3 )
                {
                    //console.log("cronJobDelayedDelivery  good to go " + c.val().indexString);
                    let comment;
                     
                    if (!isNullOrUndefined(c.val().comment) && c.val().comment !== "")
                    {
                        comment = c.val().comment + "\n" +  "משלוח דחוי לשעה" + ":" + delayed_hour_min;
                    }
                    else{
                        comment =  "משלוח דחוי לשעה" + ":" + delayed_hour_min;
                    }
                    db.ref(ref_temp + "Delayed_Delivery").child(c.key).transaction(function(delayed_deliv) {
               
                            if (delayed_deliv === null)
                            {
                               //console.log("setOnDeliveryAssigned is null ");
                                return delayed_deliv;
                            }
                            else
                            {
                               // console.log("setOnDeliveryAssigned correct");
                                delayed_deliv.comment = comment;
                            
                                return delayed_deliv;
                            }
                        }).then((delayed_deliv)=>{
                            console.log("cronjob found before rest check " + ref_temp + " " + delayed_deliv.key);
                            ref_rest.child(delayed_deliv.snapshot.val().restoraunt_key).once("value").then(snap =>{
                                console.log("cronjob found before inside rest check " + ref_temp + " " + snap.key);            
                                let area_num = snap.val().areaNum
                                            let ref = area_num == null || area_num == 0 ? "" : area_num + "/" 
                                            console.log('delayed deliv: '+ delayed_deliv.snapshot.key + " comment:" + delayed_deliv.snapshot.val().comment);
                                            db.ref(ref + "Deliveries").push(delayed_deliv.snapshot.val());
                                        var topic = 'delayed_deliveries';

                                        var message = {
                                        data: {
                                            bullshit: '850',
                                        },
                                        topic: topic
                                        };
                    
                                        // Send a message to devices subscribed to the provided topic.
                                        admin.messaging().send(message)
                                        .then((response) => {
                                            // Response is a message ID string.
                                            console.log('Successfully sent message:', response);
                                        })
                                        .catch((error) => {
                                            console.log('Error sending message:', error);
                                        });
                                        //console.log("delayed delivery  " + c.val().comment + " " + c.val().indexString);
                                        db.ref(ref + "Delayed_Delivery").child(c.key).remove();
                            })
                            
                        })
                   
            
                   
                   
                    // ref_Deliveries_modification_time.child("date").set(date);
                    // ref_Deliveries_modification_time.child("hours").set(hours_min);
                }
            }
        })
    })
        
    });
    
});

app.get('/:area/deliveries/:param',(request,response) =>{
    try {
//work
console.error("fff123  here  " + request.params.param + " " +  request.params.area )
if (request.params.param.length <10)
{
    console.error("fff123  here error3  ")
    return;
}
     let rootRef = db.ref( request.params.area + "/Deliveries").child(request.params.param);
     rootRef.once("value", function(snapshot){
        try{
         if (snapshot.val().status == "C")
         {
             console.error("fff123 not error ")
            response.render('deliveries_route',{index: String(snapshot.val().delivery_guy_index_assigned), time_arrived: String(snapshot.val().time_aprox_deliver),area:request.params.area });
         }
         else{
            console.error("fff123  error  " +snapshot.val().status )
            response.render('delivery_not_valid');
         }
        }
        catch(error){
            console.error("fff123  error2  " +error )
            response.render('delivery_not_valid');
        }
        
     })

      //  response.sendFile('map.html', { root: path.join(__dirname, '../app') });
      
      //response.sendFile('/app/f.html');
    //  console.log("/functions/src/fff2");
    } catch (error) {
        console.log("/functions/src/fff");
        console.log(error);
        response.render('delivery_not_valid');
    }
   
})


app.get('/deliveries/:param',(request,response) =>{
    try {
//work
console.error("fff123  here  " + request.params.param)
if (request.params.param.length <10)
{
    console.error("fff123  here error3  ")
    return;
}
     let rootRef = ref_Deliveries.child(request.params.param);
     rootRef.once("value", function(snapshot){
        try{
         if (snapshot.val().status == "C")
         {
             console.error("fff123 not error ")
            response.render('deliveries_route',{index: String(snapshot.val().delivery_guy_index_assigned), time_arrived: String(snapshot.val().time_aprox_deliver)});
         }
         else{
            console.error("fff123  error  " +snapshot.val().status )
            response.render('delivery_not_valid');
         }
        }
        catch(error){
            console.error("fff123  error2  " +error )
            response.render('delivery_not_valid');
        }
        
     })

      //  response.sendFile('map.html', { root: path.join(__dirname, '../app') });
      
      //response.sendFile('/app/f.html');
    //  console.log("/functions/src/fff2");
    } catch (error) {
        console.log("/functions/src/fff");
        console.log(error);
        response.render('delivery_not_valid');
    }
   
})

import { CostumerReview } from "./CostumerReview";

import { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } from 'constants';
import { Session } from 'inspector';
import { isNullOrUndefined } from 'util';
import { watchFile } from 'fs';


app.post('/rank_delivery',function (req, res, next){
    res.render('rank_delivery_done');
    let ref = req.body.icarea == null || req.body.icarea == 0 ? "" : req.body.icarea + "/"

    let rootRef = db.ref(ref + "Deliveries_Done_Date_modified").child(req.body.icdate).child(req.body.ic);
    console.log("rank_delivery0  " + ref + "Deliveries_Done_Date_modified"); 
    rootRef.once("value", function(snapshot){
        if (snapshot.val().survey_made != null && snapshot.val().survey_made == true)
        {
           return;
        }
        else{
            rootRef = db.ref(ref + "Deliveries_Done_Date_modified").child(req.body.icdate).child(req.body.ic);
            rootRef.update({
                "survey_made" : true
            });
            let cr = new CostumerReview(req.body.start_amount,snapshot.val().indexString,snapshot.val().delivery_guy_index_assigned,snapshot.val().restoraunt_key,
             req.body.satisfied1,req.body.satisfied2,req.body.satisfied3,snapshot.val().costumerName,snapshot.val().business_name,snapshot.val().costumer_phone,snapshot.val().deliveryGuyName);
             db.ref(ref + "CostumerReviewModified").child(snapshot.val().restoraunt_key).push(cr)
             db.ref(ref +"CostumerReview").push(cr);
        }
       
    });

    console.log("rank_delivery " + req.body.ic + " date: " + req.body.icdate + " area: " + req.body.icarea ); 
    console.log("  1  " + req.body.satisfied1); 
    console.log("  2  " + req.body.satisfied2); 
    console.log("  3  " + req.body.satisfied3); 
    console.log("  stars  " + req.body.start_amount); 

});

app.get('/costumers_survey/:date/:param',(request,response) =>{
    console.log("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee " + request.params.date + " " + request.params.param);
    try {
        let rootRef = Deliveries_Done_Date_modified.child(request.params.date).child(request.params.param);

        rootRef.once("value", function(snapshot){
            console.log(snapshot.val().survey_made  + "  " +   snapshot.val().status);
         if (snapshot.val().status == "D" && (snapshot.val().survey_made == null || snapshot.val().survey_made == false))
         {
            response.render('rank_delivery',{time: snapshot.val().timeDeliver, date: snapshot.val().date ,index: snapshot.val().key,restoraunt_name: snapshot.val().business_name});
         }
         else{
            response.render('rank_delivery_done');
         }
        
     });
 
    } catch (error) {
        console.log("/functions/src/fff");
        console.log(error);
        response.render('delivery_not_valid');
    }
   
})
app.get('/:area/costumers_survey/:date/:param',(request,response) =>{
    console.log("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee area" + request.params.area);
    try {
        let rootRef = db.ref(request.params.area + "/Deliveries_Done_Date_modified").child(request.params.date).child(request.params.param);

        rootRef.once("value", function(snapshot){
            console.log(snapshot.val().survey_made  + "  " +   snapshot.val().status);
         if (snapshot.val().status == "D" && (snapshot.val().survey_made == null || snapshot.val().survey_made == false))
         {
            response.render('rank_delivery',{time: snapshot.val().timeDeliver, date: snapshot.val().date ,index: snapshot.val().key,area:request.params.area,restoraunt_name: snapshot.val().business_name});
         }
         else{
            response.render('rank_delivery_done');
         }
        
     });
 
    } catch (error) {
        console.log("/functions/src/fff");
        console.log(error);
        response.render('delivery_not_valid');
    }
   
})

var requestify = require('requestify'); 



 module.exports.connected = false;
 var sess;
app.post('/loginmanager',function (req, res, next){
   
});



app.get('/loginmanager',(request,response) =>{
    try {
        module.exports.connected = false;
      //  request.session.uniqueID = "";
        response.render('login');  
    } catch (error) {
        console.log("/functions/src/fff");
        console.log(error);
    }
   
})

app.post('/123',(request,res) =>{
    console.log('blahblahblah 123d2');
    var keys = request.body.name;
    var _pass = request.body.pass;
    var _create_new = request.body.create_new;
    console.log('blahblahblah 123d2 ' + keys +  " " + _pass + " " + _create_new );
    //  const email = JSON.parse(keys) + "@" + JSON.parse(_email_end);
    //  const pass = JSON.parse(_pass);
    //  const create_new = JSON.parse(_create_new);
      const email = keys;
      const pass = _pass
      const create_new = _create_new;
     console.log('blahblahblah 123d2 ' + email + " " + pass);



          admin.auth().getUserByEmail(email)
          .then(function(userRecord) {
            // See the UserRecord reference doc for the contents of userRecord.
          //  console.log('Successfully fetched user data:', userRecord.toJSON());
            console.log('Successfully fetched user data:', userRecord.uid);
            admin.auth().deleteUser(userRecord.uid)
                .then(function() {
                    if (create_new)
                    {
                        admin.auth().createUser({
                            uid: userRecord.uid,
                            email: email,
                            password: pass,
                          })
                            .then(function(userRecord) {
                              // See the UserRecord reference doc for the contents of userRecord.
                              console.log('Successfully created new user:', userRecord.uid + " " + userRecord.email );
                            })
                            .catch(function(error) {
                              console.log('Error creating new user:', error);
                            });
                    }
                    console.log('Successfully deleted user');
                })
                .catch(function(error) {
                    console.log('Error deleting user:', error);
                });
          })
          .catch(function(error) {
           console.log('Error fetching user data:', error);
          });
          res.status(200).send();
          return null;

   
   
 })

app.get('/:param',(request,response) =>{
    console.log("request.params.param");

            response.render(request.params.param);  



   
   
 })


 


 function create_delivery(rest,street,building,apartment,city,comment,costumer_name,phone,lat,long,price)
 {
        //add delivery 
        if (isNullOrUndefined(rest))
        {
            console.error("add_delivery rest is null");
            return;
        }
        process.env.TZ = 'Asia/Jerusalem' 
        let hours_now = dateFormat(new Date().toLocaleString(),"HH:MM");
        let date_now = dateFormat(new Date().toLocaleString(),"yyyy-mm-dd");
        let phone_to_call = (isNullOrUndefined(rest.phone_to_call) || rest.phone_to_call === "" )?rest.phone:rest.phone_to_call;
        let delivery = { 
        adressFrom: rest.adress,
        adressTo: street + " " +  building + " " + city, 
        apartment: apartment,
        building: building,
        business_name: rest.name,
        city: city,
        comment: comment,
        costumerName: costumer_name,
        costumer_another_phone: "",
        costumer_phone: phone,
        date: date_now,
        deliveryGuyName: "",
        deliveryGuyPhone: "",
        delivery_guy_index_assigned: "",
        dest_cord_lat: lat,
        dest_cord_long:long,
        different_address: "" ,
        entrance: "",
        floor: "",
        index: -1,
        indexString: "-1",
        intercum_num: "",
        is_cash: false,
        is_deleted: false,
        is_different_adress: false,
        is_gas_sta: false,
        is_out_of_town_delivery: false,
        just_assigned_deliv: false,
        key: "",
        num_of_packets: "1", //to_add
        prepare_time: String(rest.time_to_prepare),
        prepare_time_modified: "",
        price: price, //to_add
        restoraunt_key: rest.key, 
        restoraunt_phone: phone_to_call,
        source_cord_lat: rest.lat,
        source_cord_long: rest.longt,
        status: "A",
        street: street,//to add
        timeArriveToRestoraunt: "",
        timeDeliver: "",
        timeInserted: hours_now,
        timeTaken:"",
        time_aprox_deliver: "",
        time_aprox_deliver_first_not_late:"",
        time_aprox_deliver_to_rest: "",
        time_aprox_deliver_to_rest_first_not_late:"",
        time_assigned: "",
        time_bonus: 0 ,
        time_late_by_deliveries: "",
        time_late_by_rest: "",
        time_max_to_costumer: 60,
        time_modified_for_prepare: "",
        was_late_deliveries: false,
        was_late_restoraunt: false,

        } 
        return delivery;


 }
// app.post('/:param',(request,response) =>{
//     try {
       
//       if (module.exports.connected  == true)
//       {
//         console.log("/aaaaaa");
//         response.sendFile(request.params.param, { root: path.join(__dirname, '../views') });
        
//       } 
//       else{
//         console.log("/bbbbbb");
//         response.render('login');  
//       }
        
//     } catch (error) {
//         console.log("/functions/src/fff");
//         console.log(error);
//     }
   
// })


exports.app = functions.https.onRequest(app);


