/**
 * MINSAL REM20 monthly statistics adapter.
 * A monthly aggregate cannot serve as a daily operational census.
 * Column mapping is explicit, never silently inferred from an unknown CSV.
 */
function numeric(v) {
  if(typeof v==="number")return v;
  if(typeof v!=="string")return NaN;
  const t=v.trim().replace(/\s/g,"");
  if(!/^[+-]?\d+(?:[,.]\d+)?$/.test(t))return NaN;
  return Number(t.replace(",","."));
}
export function parseDelimited(text,delimiter=",") {
  if(typeof text!=="string"||![";",",","\t"].includes(delimiter))
    throw new TypeError("invalid delimited input");
  const records=[],str=text.replace(/^\uFEFF/,"");
  let row=[],cell="",inQuotes=false;
  for(let i=0;i<str.length;i++){
    const ch=str[i];
    if(inQuotes){
      if(ch==='"'&&str[i+1]==='"'){cell+='"';i++;}
      else if(ch==='"')inQuotes=false;
      else cell+=ch;
    }else if(ch==='"'){
      if(cell.trim())throw new Error("unexpected quote");
      inQuotes=true;
    }else if(ch===delimiter){row.push(cell);cell="";}
    else if(ch==="\r"||ch==="\n"){
      if(ch==="\r"&&str[i+1]==="\n")i++;
      row.push(cell);if(row.some(x=>x!==""))records.push(row);
      row=[];cell="";
    }else cell+=ch;
  }
  if(inQuotes)throw new Error("unterminated CSV quote");
  row.push(cell);if(row.some(x=>x!==""))records.push(row);
  if(!records.length)return {headers:[],rows:[]};
  const headers=records.shift().map(v=>v.trim());
  if(headers.some(v=>!v)||new Set(headers).size!==headers.length)throw new Error("invalid/duplicate headers");
  const rows=records.map((cells,i)=>{
    if(cells.length!==headers.length)throw new Error("column count mismatch at line "+(i+2));
    return Object.fromEntries(headers.map((key,j)=>[key,cells[j]]));
  });
  return {headers,rows};
}
export function normalizeRem20(raw,{columns,sourceUrl,releaseDate,area=null}={}) {
  const keys=["establishment","year","month","occupiedBedDays","availableBedDays"];
  if(!columns||keys.some(k=>typeof columns[k]!=="string"||!columns[k]))
    throw new Error("verified dictionary column mapping required");
  if(!Array.isArray(raw)||!raw.length)throw new Error("nonempty raw REM20 records required");
  if(typeof sourceUrl!=="string"||!sourceUrl.startsWith("https://")
    ||!releaseDate||!Number.isFinite(Date.parse(releaseDate)))throw new Error("official source and releaseDate required");
  if(area!==null&&!columns.functionalArea)throw new Error("functional area mapping required");
  return raw.map((row,i)=>{
    for(const k of keys)if(!Object.hasOwn(row,columns[k]))throw new Error("missing mapped column "+columns[k]);
    if(area!==null&&row[columns.functionalArea]!==area)return null;
    const establishment=String(row[columns.establishment]??"").trim();
    const year=numeric(row[columns.year]),month=numeric(row[columns.month]);
    const occupiedBedDays=numeric(row[columns.occupiedBedDays]),availableBedDays=numeric(row[columns.availableBedDays]);
    if(!establishment||!Number.isInteger(year)||year<2000||year>2100||!Number.isInteger(month)||month<1||month>12)
      throw new Error("invalid institution/period at row "+(i+1));
    if(!Number.isFinite(occupiedBedDays)||occupiedBedDays<0||!Number.isFinite(availableBedDays)||availableBedDays<0)
      throw new Error("invalid bed-days at row "+(i+1));
    return {establishment,year,month,
      functionalArea:columns.functionalArea?row[columns.functionalArea]:null,
      occupiedBedDays,availableBedDays,sourceType:"official_aggregate",
      sourceUrl,releaseDate,periodGranularity:"month",
      qualityFlags:[
        ...(availableBedDays===0?["ZERO_AVAILABLE_BED_DAYS"]:[]),
        ...(occupiedBedDays>availableBedDays&&availableBedDays>0?["OVER_100_PERCENT_OCCUPANCY"]:[])
      ]};
  }).filter(Boolean);
}
export function summarizeRem20(records,{establishment=null,year=null,area=null}={}) {
  if(!Array.isArray(records)||!records.length)throw new Error("records required");
  const selected=records.filter(r=>(!establishment||r.establishment===establishment)
    &&(!year||r.year===year)&&(!area||r.functionalArea===area));
  if(!selected.length)throw new Error("no matching REM20 rows");
  if(selected.some(r=>r.sourceType!=="official_aggregate"||r.periodGranularity!=="month"))
    throw new Error("REM20 source type/monthly period required");
  const eligible=selected.filter(r=>r.availableBedDays>0);
  if(!eligible.length)throw new Error("no positive available bed-days in selected rows");
  const occupied=eligible.reduce((n,r)=>n+r.occupiedBedDays,0);
  const available=eligible.reduce((n,r)=>n+r.availableBedDays,0);
  return {sourceType:"official_aggregate",periodGranularity:"month",establishment,year,area,
    rows:selected.length,eligibleRows:eligible.length,
    excludedZeroBedDays:selected.length-eligible.length,
    rowsOver100Pct:eligible.filter(r=>r.occupiedBedDays>r.availableBedDays).length,
    occupiedBedDays:occupied,availableBedDays:available,occupancyPct:100*occupied/available,
    warning:"Monthly aggregated benchmark. Not a daily census, not inferred effective beds."};
}
