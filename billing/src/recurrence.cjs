'use strict';
const {assertDate} = require('./calculator.cjs');
function dateParts(date) {
  assertDate(date, 'date');
  const [year,month,day] = date.split('-').map(Number);
  return {year,month,day};
}
function ymd(y,m,d) { return String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }
function lastDay(year,month) { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }
function nextBillingDate(currentDate,frequency,anchorDate=currentDate) {
  const c=dateParts(currentDate), a=dateParts(anchorDate);
  if (frequency === 'daily' || frequency === 'weekly') {
    const days = frequency === 'daily' ? 1 : 7;
    const utc = new Date(Date.UTC(c.year,c.month-1,c.day+days));
    return utc.toISOString().slice(0,10);
  }
  if (frequency === 'monthly') {
    const total=c.year*12+(c.month-1)+1;
    const year=Math.floor(total/12), month=(total%12)+1;
    return ymd(year,month,Math.min(a.day,lastDay(year,month)));
  }
  if (frequency === 'yearly') {
    let year=c.year+1;
    const month=a.month;
    let candidate=ymd(year,month,Math.min(a.day,lastDay(year,month)));
    // A yearly anniversary must progress even if the current date is a proration-adjusted later date.
    while(candidate<=currentDate){year++; candidate=ymd(year,month,Math.min(a.day,lastDay(year,month)));}
    return candidate;
  }
  throw new RangeError('Unsupported billing frequency: '+frequency);
}
module.exports={nextBillingDate};
