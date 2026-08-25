export type Test = { id:string; title:string; category:string; exam:string; questions:number; duration:number; price:number; difficulty:"Easy"|"Medium"|"Hard"; description:string; marks:number; negative:string };
export const tests:Test[]=[
 {id:"jkssb-01",title:"JKSSB Junior Assistant Full Mock 01",category:"JKSSB",exam:"Junior Assistant",questions:100,duration:120,price:0,difficulty:"Medium",description:"A full-length practice set aligned with the latest JKSSB Junior Assistant pattern.",marks:100,negative:"0.25 mark"},
 {id:"jkpsc-01",title:"JKPSC Prelims GS Practice Set 01",category:"JKPSC",exam:"Prelims",questions:100,duration:120,price:99,difficulty:"Hard",description:"Build exam temperament with a balanced General Studies mock.",marks:200,negative:"0.33 mark"},
 {id:"patwari-01",title:"JKSSB Patwari Mega Mock",category:"Patwari",exam:"Patwari",questions:120,duration:120,price:49,difficulty:"Medium",description:"Comprehensive mock covering GK, reasoning and quantitative aptitude.",marks:120,negative:"0.25 mark"},
 {id:"police-01",title:"JK Police Constable Practice Test",category:"Police Exams",exam:"Constable",questions:80,duration:90,price:0,difficulty:"Easy",description:"Confidence-building test for JK Police recruitment aspirants.",marks:80,negative:"None"},
 {id:"bank-01",title:"Banking Aptitude Sprint",category:"Banking",exam:"IBPS/SBI",questions:60,duration:60,price:49,difficulty:"Hard",description:"Time-bound quantitative and reasoning practice.",marks:60,negative:"0.25 mark"},
 {id:"ca-01",title:"J&K Current Affairs: August 2026",category:"Current Affairs",exam:"Current Affairs",questions:50,duration:45,price:0,difficulty:"Easy",description:"Monthly current affairs practice with explanations.",marks:50,negative:"None"}
];
export const questions=[
 {id:1,text:"Which river is commonly called the lifeline of Kashmir Valley?",options:["Jhelum","Chenab","Ravi","Tawi"],answer:0,explanation:"The Jhelum flows through the Kashmir Valley and Srinagar."},
 {id:2,text:"The capital of Jammu and Kashmir during the summer is:",options:["Jammu","Srinagar","Leh","Anantnag"],answer:1,explanation:"Srinagar is the summer capital; Jammu is the winter capital."},
 {id:3,text:"Which national park is located in the Kashmir Valley?",options:["Dachigam","Jim Corbett","Kaziranga","Gir"],answer:0,explanation:"Dachigam National Park lies near Srinagar and is known for the hangul."},
 {id:4,text:"What is the full form of RTI?",options:["Right to Information","Road Transport Institute","Rural Trade Initiative","Regional Tax Index"],answer:0,explanation:"RTI stands for Right to Information."},
 {id:5,text:"If 20% of a number is 40, the number is:",options:["80","160","200","240"],answer:2,explanation:"40 ÷ 0.20 = 200."}
];
export const categories=["All","JKSSB","JKPSC","Police Exams","Patwari","Banking","SSC","Railway","General Knowledge","Current Affairs"];
