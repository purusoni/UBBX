// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount)
        external
        returns (bool);
    function allowance(address owner, address spender)
        external
        view
        returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount)
        external
        returns (bool);
}


contract ERC20Token is IERC20
{
    string public name;
    string public symbol;
    uint8 public decimals;
    uint public initialReceiveAmount;
    uint256 public totalSupply;
    address public owner;
    mapping(address => uint256) public balanceOf; // Balance of your tokens
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public receivedTokensAtLeastOnce;

    constructor(uint256 _initialReceiveAmount, uint8 _decimals) 
    {
        name = "yoda";
        symbol = "YODA";
        decimals = _decimals;
        initialReceiveAmount = _initialReceiveAmount ;//in whole units
        totalSupply = _initialReceiveAmount * 10 ** decimals;
        balanceOf[msg.sender] = totalSupply;
        owner = msg.sender;
    }
    modifier onlyOwner() {
       require(msg.sender == owner, "Only contract owner can mint");
       _;
    }

    modifier notAlreadyReceived(){
        require(receivedTokensAtLeastOnce[msg.sender]==false, "You have already received tokens , contact the staff for more");
        _;
    }
 
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // Transfer tokens to an address
    function transfer(address _to, uint256 _value) public returns (bool success) 
    {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        require(_to != address(0), "Invalid address");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool success) 
    {
        require(_spender != address(0), "Invalid address");
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }
  
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) 
    {
        require(balanceOf[_from] >= _value, "Insufficient balance");
        require(_to != address(0), "Invalid address");
        require(allowance[_from][msg.sender] >= _value, "Allowance exceeded");
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        emit Transfer(_from, _to, _value);
        return true;
    }
    function _mint(address account,uint256 amountInWei) internal{
        require(account != address(0), "Cannot mint to zero address");
        totalSupply += amountInWei;
        balanceOf[account] += amountInWei;
        emit Transfer(address(0), account, amountInWei);

    } 
    // To create new tokens you mint
    function mint(address account,uint256 amount) public onlyOwner 
    {   
        _mint(account, amount*10**decimals);   
    }

    function receiveTokens() public notAlreadyReceived
    {
        _mint(msg.sender, initialReceiveAmount*10**decimals);
        receivedTokensAtLeastOnce[msg.sender] = true;
    } 
}