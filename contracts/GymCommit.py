# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json

class GymCommit(gl.Contract):
    bet_count: u256
    bet_creator: TreeMap[u256, str]
    bet_type: TreeMap[u256, str]
    bet_target: TreeMap[u256, u256]
    bet_deposit: TreeMap[u256, u256]
    bet_deadline: TreeMap[u256, u256]
    bet_status: TreeMap[u256, str]
    bet_proof_url: TreeMap[u256, str]
    bet_ai_comment: TreeMap[u256, str]
    treasury_balance: u256
    admin_address: str

    def __init__(self):
        self.bet_count = u256(0)
        self.treasury_balance = u256(0)
        self.admin_address = ""

    @gl.public.write
    def initialize_admin(self) -> typing.Any:
        if self.admin_address != "":
            return "ALREADY_INITIALIZED"
        self.admin_address = gl.message.sender
        return "SUCCESS"

    @gl.public.write
    def create_bet(self, bet_type: str, target: u256, deadline_days: u256, deposit_amount: u256) -> typing.Any:
        if bet_type != "WEIGHT_LOSS" and bet_type != "GYM_ATTENDANCE":
            return "INVALID_BET_TYPE"
        if deposit_amount == u256(0):
            return "INVALID_DEPOSIT"
        
        bet_id = self.bet_count
        self.bet_creator[bet_id] = gl.message.sender
        self.bet_type[bet_id] = bet_type
        self.bet_target[bet_id] = target
        self.bet_deposit[bet_id] = deposit_amount
        self.bet_deadline[bet_id] = deadline_days
        self.bet_status[bet_id] = "ACTIVE"
        self.bet_proof_url[bet_id] = ""
        self.bet_ai_comment[bet_id] = ""
        
        self.bet_count = bet_id + u256(1)
        return str(bet_id)

    @gl.public.write
    def submit_proof(self, bet_id: u256, proof_url: str) -> typing.Any:
        if bet_id >= self.bet_count:
            return "INVALID_BET_ID"
        if self.bet_status[bet_id] != "ACTIVE":
            return "NOT_ACTIVE"
        if len(proof_url) == 0:
            return "EMPTY_PROOF_URL"
        
        self.bet_proof_url[bet_id] = proof_url
        self.bet_status[bet_id] = "PENDING_REVIEW"
        return "SUCCESS"

    @gl.public.write
    def evaluate_bet(self, bet_id: u256) -> typing.Any:
        if bet_id >= self.bet_count:
            return "INVALID_BET_ID"
        if self.bet_status[bet_id] != "PENDING_REVIEW":
            return "NOT_PENDING_REVIEW"
        
        url = self.bet_proof_url[bet_id]
        b_type = self.bet_type[bet_id]
        target = self.bet_target[bet_id]
        creator = self.bet_creator[bet_id]
        deposit = self.bet_deposit[bet_id]

        def run() -> str:
            content = ""
            if len(url) > 0:
                resp = gl.nondet.web.get(url)
                content = resp.body.decode("utf-8")
            
            prompt = (
                f"You are GymCommit AI Personal Trainer. Evaluate this workout/weight-loss check-in.\n"
                f"User Wallet Address: {creator}\n"
                f"Commitment Type: {b_type}\n"
                f"Target Value: {target}\n"
                f"Submitted Proof File Content:\n"
                f"\"\"\"\n{content[:4000]}\n\"\"\"\n\n"
                f"Analyze the submitted proof carefully:\n"
                f"- Check if there is digital alteration, photo editing, or Photoshop on the weight numbers.\n"
                f"- Check if the person performing the exercise matches the creator (or if there is an imposter).\n"
                f"- Check if the workout intensity or weight log matches the target.\n\n"
                f"Respond with ONLY a JSON string, no other explanation or markdown. Format:\n"
                f"{{{{\n"
                f"  \"status\": \"PASSED\" or \"FAILED\",\n"
                f"  \"comment\": \"Your detailed feedback as an encouraging but strict personal trainer.\"\n"
                f"}}}}"
            )
            return gl.nondet.exec_prompt(prompt)

        result_str = gl.eq_principle.strict_eq(run)
        
        data = json.loads(result_str)
        status = data["status"]
        comment = data["comment"]
        
        self.bet_ai_comment[bet_id] = comment
        
        if status == "PASSED":
            self.bet_status[bet_id] = "SUCCESS"
            return result_str
        else:
            self.bet_status[bet_id] = "FAILED"
            self.treasury_balance = self.treasury_balance + deposit
            return result_str

    @gl.public.write
    def fund_treasury(self, amount: u256) -> typing.Any:
        if amount == u256(0):
            return "INVALID_AMOUNT"
        self.treasury_balance = self.treasury_balance + amount
        return "SUCCESS"

    @gl.public.view
    def get_bet(self, bet_id: u256) -> str:
        if bet_id >= self.bet_count:
            return ""
        
        creator = self.bet_creator[bet_id]
        b_type = self.bet_type[bet_id]
        target = str(self.bet_target[bet_id])
        deposit = str(self.bet_deposit[bet_id])
        deadline = str(self.bet_deadline[bet_id])
        status = self.bet_status[bet_id]
        proof = self.bet_proof_url[bet_id]
        comment = self.bet_ai_comment[bet_id]
        
        data = {
            "creator": creator,
            "type": b_type,
            "target": target,
            "deposit": deposit,
            "deadline": deadline,
            "status": status,
            "proof_url": proof,
            "comment": comment
        }
        return json.dumps(data, sort_keys=True, separators=(",", ":"))
