const { ethers } = require("hardhat");

async function main() {
 console.log(" Checking creation fee...");

 const [deployer] = await ethers.getSigners();
 console.log(" Using account:", deployer.address);

 // AgentFactory address from deployment
 const factoryAddress = "0xC783aC13244Cc2454dF4393c556b10ECE4820B1F";

 // Get contract instance
 const AgentFactory = await ethers.getContractFactory("AgentFactory");
 const agentFactory = AgentFactory.attach(factoryAddress);

 try {
 // Check current fee
 const currentFee = await agentFactory.creationFee();
 console.log(" Current creation fee:", ethers.formatEther(currentFee), "CORE");

 // Check if contract is paused
 const isPaused = await agentFactory.paused();
 console.log(" Contract paused:", isPaused);

 // Check owner
 const owner = await agentFactory.owner();
 console.log(" Contract owner:", owner);
 console.log(" Our address:", deployer.address);

 // Check platform treasury
 const treasury = await agentFactory.platformTreasury();
 console.log(" Platform treasury:", treasury);

 // Check total agents
 const totalAgents = await agentFactory.getTotalAgents();
 console.log(" Total agents:", totalAgents.toString());

 } catch (error) {
 console.error(" Error checking contract:", error.message);
 }
}

main()
.then(() => process.exit(0))
.catch((error) => {
 console.error(" Script failed:", error);
 process.exit(1);
 });
