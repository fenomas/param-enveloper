var I=Object.defineProperty;var D=(e,t,n)=>t in e?I(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var p=(e,t,n)=>D(e,typeof t!="symbol"?t+"":t,n);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const r of o)if(r.type==="childList")for(const c of r.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&s(c)}).observe(document,{childList:!0,subtree:!0});function n(o){const r={};return o.integrity&&(r.integrity=o.integrity),o.referrerPolicy&&(r.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?r.credentials="include":o.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(o){if(o.ep)return;o.ep=!0;const r=n(o);fetch(o.href,r)}})();class m{constructor(t,n,s,o,r){p(this,"type");p(this,"v0");p(this,"v1");p(this,"t0");p(this,"t1");p(this,"k");p(this,"tgt");this.type=t,this.v0=+n,this.v1=+s,this.t0=+o,this.t1=+r,this.k=.1,this.tgt=.1}toString(){return`ParamEvent(${this.type}, t:${this.t0}~${this.t1} v:${this.v0}~${this.v1})`}}function R(e,t){return!e[0]||t<=e[0].t0?-1:e.findIndex(n=>t<=n.t1)}function L(e,t){const n=t-e.t0;switch(e.type){case"HOLD":return e.v0;case"SWEEP":return M(n,e.v0,e.tgt,e.k);case"RAMP_LINEAR":return k(n,e.v0,e.v1,e.t1-e.t0);case"RAMP_EXPO":return H(n,e.v0,e.v1,e.t1-e.t0)}}function M(e,t,n,s){return n+(t-n)*Math.exp(-e/s)}function k(e,t,n,s){return t+(n-t)*e/s}function H(e,t,n,s){return t*Math.pow(n/t,e/s)}function v(e){return e.__paramEnveloperEvents||(e.cancelScheduledValues(0),e.__paramEnveloperEvents=[new m("HOLD",e.value,e.value,0,0)]),e}class ${constructor(t){p(this,"ctx");p(this,"zeroRampTarget");this.ctx=t,this.zeroRampTarget=.001}initParam(t,n=0){const s=v(t),o=s.__paramEnveloperEvents;s.cancelScheduledValues(0),o.length=0,s.setValueAtTime(n,0),o.push(new m("HOLD",n,n,0,0))}startEnvelope(t,n=0){const s=v(t),o=s.__paramEnveloperEvents,r=o.at(-1),c=this.ctx.currentTime,a=Math.max(n,c);if(!r)return g();if(c>=r.t1)o.length=0;else{const d=R(o,c);d>0&&o.splice(0,d)}if(o.length===0){o.push(new m("HOLD",r.v1,r.v1,0,a)),s.setValueAtTime(r.v1,a),y("start:  fresh envelope, value",r.v1);return}const l=R(o,a);if(l<0){o.push(new m("HOLD",r.v1,r.v1,0,a)),s.setValueAtTime(r.v1,a),y("start:  envelope begins: value",r.v1);return}const u=o[l];if(o.length=l+1,u.t1===a){s.cancelScheduledValues(a+1e-4),y("start:  envelope begins: value",r.v1);return}const i=L(u,a);if(u.t1=a,u.v1=i,s.cancelScheduledValues(a),y("start:  envelope begins: value",u.v1),u.type==="HOLD")s.setValueAtTime(i,a);else if(u.type==="RAMP_LINEAR")s.linearRampToValueAtTime(i,a);else if(u.type==="RAMP_EXPO"){const d=i||this.zeroRampTarget;s.exponentialRampToValueAtTime(d,a)}else u.type==="SWEEP"&&s.setValueAtTime(i,a)}addHold(t,n){if(!(n>0))return b(n);const s=v(t),o=s.__paramEnveloperEvents,r=o[o.length-1];if(!r)return g();if(r.t1===1/0){const i=r.t0+n;this.startEnvelope(s,i);return}const c=r.v1,a=r.t1,l=c,u=a+n;o.push(new m("HOLD",c,l,a,a+n)),s.setValueAtTime(l,u)}addRamp(t,n,s,o=!1){if(!(n>0))return b(n);const r=v(t),c=r.__paramEnveloperEvents,a=c[c.length-1];if(!a)return g();if(a.t1===1/0)return P();const l=a.t1,u=l+n;let i=a.v1,d=s;o?(i===0&&(i=this.zeroRampTarget),d===0&&(d=this.zeroRampTarget),r.exponentialRampToValueAtTime(d,u)):r.linearRampToValueAtTime(d,u);const E=o?"RAMP_EXPO":"RAMP_LINEAR";c.push(new m(E,i,d,l,u))}addSweep(t,n,s,o){const r=v(t),c=r.__paramEnveloperEvents,a=c[c.length-1];if(!a)return g();if(a.t1===1/0)return P();const l=a.t1,u=a.v1;r.setTargetAtTime(s,l,o);const i=new m("SWEEP",u,s,l,1/0);i.k=o,i.tgt=s,n>0&&isFinite(n)&&(i.t1=l+n,i.v1=L(i,i.t1)),c.push(i),y(`sweep: to tgt ${s} const ${o} from t ${l} to ${i.t1}`)}getValueAtTime(t,n){const o=v(t).__paramEnveloperEvents,r=R(o,n);return r<0?o[0]&&n<=o[0].t0?o[0].v0:o.at(-1).v1:o[r]?L(o[r],n):(g(),0)}}function P(){console.warn("ParamEnveloper: ignoring event scheduled after an infinite sweep")}function b(e){console.warn("ParamEnveloper: ignoring event invalid duration",e)}function g(){console.warn("ParamEnveloper: internal error! Event queue was empty")}const y=()=>{},A=[],T=(e,t)=>{A.push({name:e,fn:t})};T("break",(e,t,n)=>{e.startEnvelope(t,n)});T("sweep",(e,t,n)=>{e.startEnvelope(t,n),e.addRamp(t,.5,.9),e.addSweep(t,-1,0,.4)});T("ramps",(e,t,n)=>{e.startEnvelope(t,n);for(let s=0;s<20;s++)e.addRamp(t,.1,s%2?.3:.7)});T("adsr",(e,t,n)=>{e.startEnvelope(t,n),e.addRamp(t,.15,1),e.addHold(t,.05),e.addRamp(t,.3,.5,!0)});T("release",(e,t,n)=>{e.startEnvelope(t,n),e.addSweep(t,-1,0,.2)});globalThis?.document?.addEventListener("DOMContentLoaded",()=>{document.body.style.padding="1rem",document.body.style.font="17px sans-serif";const e=document.createElement("p");e.innerHTML="Press/release spacebar to start/end an envelope";const t=document.createElement("canvas");t.width=800,t.height=260,t.style.backgroundColor="black",document.body.appendChild(e),document.body.appendChild(t),document.addEventListener("keydown",w),document.addEventListener("click",w);const n=document.createElement("div");n.style.margin="20px 50px",document.body.appendChild(n),n.innerHTML="ad-hoc test cases",A.forEach(({name:s,fn:o})=>{const r=document.createElement("button");r.style.margin="10px",r.style.padding="10px",r.innerText=""+s,r.onclick=()=>{F(),h&&o(h.enveloper,h.param,h.ctx.currentTime+.1)},n.appendChild(r)})});let h=null;function F(){h||w()}function w(){document.removeEventListener("keydown",w),document.removeEventListener("click",w);const e=new AudioContext,t=e.createOscillator(),n=e.createGain(),s=e.createGain(),o=e.createAnalyser();t.start(),t.connect(n),n.connect(s),s.connect(e.destination),n.connect(o),s.gain.setValueAtTime(.5,0);const r=new $(e),c=n.gain;r.initParam(c,0),r.startEnvelope(c,0),r.addRamp(c,.04,.5),r.addSweep(c,.5,0,.5),h={ctx:e,enveloper:r,param:c};const a=document.querySelector("canvas"),l=a.getContext("2d");l.fillStyle="#000",l.fillRect(0,0,a.width,a.height);const u=new Float32Array(256);let i=2;const d=()=>{requestAnimationFrame(d),o.getFloatTimeDomainData(u);const f=1,x=u.reduce((V,O)=>Math.max(V,O),0)*256;l.fillStyle="#000",l.fillRect(i,0,f,a.height),l.fillStyle="#FFF",l.fillRect(i,a.height-x,f,x),i=(i+f)%a.width};d();let E=!1;const _=()=>{E||(E=!0,A.at(-2)?.fn(r,c,e.currentTime+.01))},S=()=>{E=!1,A.at(-1)?.fn(r,c,e.currentTime+.01)};document.addEventListener("keydown",f=>{f.key===" "&&(f.preventDefault(),_())}),document.addEventListener("keyup",f=>{f.key===" "&&S()})}
