/* ===================================
FinTrack UI Animations
=================================== */

/* Page Load Animation */

document.addEventListener("DOMContentLoaded",()=>{

document.body.classList.add("page-loaded")

})


/* Page Transition */

document.querySelectorAll("a").forEach(link=>{

if(link.hostname===window.location.hostname){

link.addEventListener("click",function(e){

e.preventDefault()

const href=this.href

document.body.classList.add("page-exit")

setTimeout(()=>{

window.location=href

},350)

})

}

})


/* Scroll Reveal */

const observer=new IntersectionObserver((entries)=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

entry.target.classList.add("active")

}

})

},{threshold:.15})

document.querySelectorAll(".reveal").forEach(el=>{

observer.observe(el)

})


/* Apple Tilt Effect */

document.querySelectorAll(".tilt-card").forEach(card=>{

card.addEventListener("mousemove",(e)=>{

const rect=card.getBoundingClientRect()

const x=e.clientX-rect.left
const y=e.clientY-rect.top

const centerX=rect.width/2
const centerY=rect.height/2

const rotateX=(y-centerY)/20
const rotateY=(centerX-x)/20

card.style.transform=`rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`

})

card.addEventListener("mouseleave",()=>{

card.style.transform="rotateX(0) rotateY(0)"

})

})


/* AI Panel Animation */

window.addEventListener("load",()=>{

const ai=document.querySelector(".ai-card")

if(ai){

setTimeout(()=>{

ai.classList.add("show")

},400)

}

})
