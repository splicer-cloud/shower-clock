/* Weather location is a saved place, not continuous device tracking. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WeatherLocation=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const KEY='shower-clock.weather-place.v1';
  class Place {
    constructor(storage,home){this.storage=storage;this.home=home;this.place=home;this.saved=false;try{const v=JSON.parse(storage.getItem(KEY));if(v&&Number.isFinite(v.lat)&&Math.abs(v.lat)<=90&&Number.isFinite(v.lon)&&Math.abs(v.lon)<=180){this.place=v;this.saved=true;}}catch{}}
    use(lat,lon){if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180)throw Error('Invalid location');const v={lat:Math.round(lat*100)/100,lon:Math.round(lon*100)/100};this.storage.setItem(KEY,JSON.stringify(v));this.place=v;this.saved=true;return v;}
    reset(){this.storage.removeItem(KEY);this.place=this.home;this.saved=false;}
  }
  return {Place,KEY};
});
