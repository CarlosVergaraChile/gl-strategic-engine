/**
 * REM20 monthly reference import. This is NEVER a live daily bed census.
 * Import requires a user-confirmed mapping to the ACTUAL official dictionary.
 * All occupancy rates are computed from summed raw bed-days.
 */
function parseDecimal(value) {
  if(typeof value==="number") return value;
  if(typeof value!=="string") return NaN;
  const s=value.trim().replace(/\s/g,"");
  if(!s) return NaN;
  // Interpret decimal comma or decimal point, reject ambiguous grouping.
  if (/^[+-]?\d+(?:,\d+)?$/.test(s)) return Number(s.replace(",","."));
  if (/^[+-]?\d+(?:\.\d+)?$/.test(s)) return Number(s);
  return NaN;
}
export function parseDelimited(text,delimiter=",") {
  if(typeof text!=="string"||![";",",","\t"].includes(delimiter))throw new TypeError("invalid delimited data");
  const records=[]; let row=[],cell="",quoted=false;
  const src=text.replace(/^\uFEFF/,"");
  for(let i=0;i<src.length;i++){
    const c=src[i];
    if(quoted){
      if(c==='"'&&src[i+1]==='"'){cell+='"';i++;}
      else if(c==='"')quoted=false;
      else cell+=c;
    }else if(c==='"'){if(cell.trim())throw new Error("unexpected quote");quoted=true;}
    else if(c===delimiter){row.push(cell);cell="";}
    else if(c==="\n"||c==="\r"){
      if(c==="\r"&&src[i+1]==="\n")i++;
      row.push(cell);if(row.some(x=>x!==""))records.push(row);row=[];cell="";
    }else cell+=c;
  }
  if(quoted)throw new Error("unterminated CSV quote");
  row.push(cell);if(row.some(x=>x!==""))records.push(row);
  if(!records.length)return {headers:[],rows:[]};
  const headers=records.shift().map(x=>x.trim());
  if(headers.some(x=>!x)||new Set(headers).size!==headers.length)throw new Error("invalid/duplicate headers");
  const rows=records.map((values,i)=>{
    if(values.length!==headers.length)throw new Error("column count mismatch at line "+(i+2));
    return Object.fromEntries(headers.map((h,j)=>[h,values[j]]));
  });
  return {headers,rows};
}
export function normalizeRem20(raw,{columns,sourceUrl,releaseDate,area=null}={}) {
  if(!columns||typeof columns!=="object")throw new Error("verified dictionary column mapping required");
  const names=["establishment","year","month","occupiedBedDays","availableBedDays"];
  if(names.some(k=>typeof columns[k]!=="string"||!columns[k]))throw new Error("incomplete dictionary mapping");
  if(!Array.isArray(raw)||!raw.length)throw new Error("nonempty raw REM20 records required");
  if(!sourceUrl||!sourceUrl.startsWith("https://")||!releaseDate||!Number.isFinite(Date.parse(releaseDate)))throw new Error("official source and releaseDate required");
  return raw.map((r,i)=>{
    for(const key of names)if(!Object.hasOwn(r,columns[key]))throw new Error("missing mapped column "+columns[key]);
    if(area!==null&&!columns.functionalArea)throw new Error("area mapped column required");
    if(area!==null&&r[columns.functionalArea]!==area)return null;
    const year=parseDecimal(r[columns.year]),month=parseDecimal(r[columns.month]);
    const occupiedBedDays=parseDecimal(r[columns.occupiedBedDays]),availableBedDays=parseDecimal(r[columns.availableBedDays]);
    const establishment=String(r[columns.establishment]??"").trim();
    if(!establishment||!Number.isInteger(year)||year<2000||year>2100||!Number.isInteger(month)||month<1||month>12)
      throw new Error("invalid institution/period at row "+(i+1));
    if(!Number.isFinite(occupiedBedDays)||!Number.isFinite(availableBedDays)||occupiedBedDays<0||availableBedDays<0)
      throw new Error("invalid bed-days at row "+(i+1));
    return {establishment,year,month,functionalArea:columns.functionalArea?r[columns.functionalArea]:null,
      occupiedBedDays,availableBedDays,qualityFlags:[...(availableBedDays===0?["ZERO_AVAILABLE_BED_DAYS"]:[]),...(occupiedBedDays>availableBedDays&&availableBedDays>0?["OVER_100_PERCENT_OCCUPANCY"]:[])],sourceType:"official_aggregate",sourceUrl,releaseDate,
      periodGranularity:"month"};
  }).filter(Boolean);
}
export function summarizeRem20(records,{establishment=null,year=null,area=null}={}) {
  if(!Array.isArray(records)||!records.length)throw new Error("records required");
  const selected=records.filter(r=>(!establishment||r.establishment===establishment)&&(!year||r.year===year)
    &&(!area||r.functionalArea===area));
  if(!selected.length)throw new Error("no matching REM20 rows");
  if(selected.some(r=>r.sourceType!=="official_aggregate"||r.periodGranularity!=="month"))
    throw new Error("REM20 source type/monthly period required");
  const occupied=selected.reduce((n,r)=>n+r.occupiedBedDays,0);
  const available=selected.reduce((n,r)=>n+r.availableBedDays,0);
  if(available<=0)throw new Error("invalid aggregate denominator");
  return {sourceType:"official_aggregate",periodGranularity:"month",establishment,year,area,
    rows:selected.length,eligibleRows:eligible.length,excludedZeroBedDays,\n    rowsOver100Pct:eligible.filter(r=>r.occupiedBedDays>r.availableBedDays).length,\n    occupiedBedDays:occupied,availableBedDays:available,
    occupancyPct:100*occupied/available,
    warning:"Monthly aggregated benchmark. Not a daily census, not inferred effective beds."};
}
