import React, { useState, useEffect, useRef } from 'react';
import { Copy } from 'lucide-react';

const Card = ({ children, className = "" }) => (
  <div className={`glass-card glass-card-hover p-6 animate-fade-in-up ${className}`}>{children}</div>
);

function getDirectReferrals(tree) {
  if (!tree || !Array.isArray(tree)) return 0;
  return tree.length;
}

function getTotalTeam(tree) {
  if (!tree || !Array.isArray(tree)) return 0;
  let count = tree.length;
  tree.forEach(child => {
    if (child.children && Array.isArray(child.children)) {
      count += getTotalTeam(child.children);
    }
  });
  return count;
}

function getTeamTurnover(tree) {
  if (!tree || !Array.isArray(tree)) return 0;
  let sum = 0;
  tree.forEach(child => {
    if (child.investments && Array.isArray(child.investments)) {
      sum += child.investments.reduce((a, b) => a + (b.amount || 0), 0);
    }
    if (child.children && Array.isArray(child.children)) {
      sum += getTeamTurnover(child.children);
    }
  });
  return sum;
}

function getSponsor(tree, userId) {
  // recursively find parent
  let sponsor = null;
  function find(node, parent) {
    if (!node) return;
    if (node.id === userId) sponsor = parent;
    if (node.children) node.children.forEach(child => find(child, node));
  }
  find(tree, null);
  return sponsor;
}
function getRank(tree) {
  // mock: 1 + direct referrals
  return 1 + getDirectReferrals(tree);
}
const rankNames = ["Beginner", "Partner", "Leader", "Pro", "Diamond", "Legend"];
function getRankName(rank) {
  return rankNames[Math.min(rank - 1, rankNames.length - 1)];
}

// --- Новый массив уровней и условий ---
const REFERRAL_LEVELS = [
  { level: 1, percent: 10, requiredDirects: 0 },
  { level: 2, percent: 5, requiredDirects: 2 },
  { level: 3, percent: 5, requiredDirects: 5 },
  { level: 4, percent: 5, requiredDirects: 10 },
  { level: 5, percent: 5, requiredDirects: 15 },
  { level: 6, percent: 3, requiredDirects: 20 },
  { level: 7, percent: 2, requiredDirects: 25 },
];

// Массив рангов и требований
const RANKS = [
  { level: 1, turnover: 10000 },
  { level: 2, turnover: 25000 },
  { level: 3, turnover: 50000 },
  { level: 4, turnover: 100000 },
  { level: 5, turnover: 250000 },
  { level: 6, turnover: 500000 },
  { level: 7, turnover: 1000000 },
  { level: 8, turnover: 2500000 },
  { level: 9, turnover: 5000000 },
  { level: 10, turnover: 10000000 },
  { level: 11, turnover: 15000000 },
  { level: 12, turnover: 20000000 },
  { level: 13, turnover: 30000000 },
  { level: 14, turnover: 40000000 },
  { level: 15, turnover: 50000000 },
  { level: 16, turnover: 60000000 },
  { level: 17, turnover: 70000000 },
  { level: 18, turnover: 80000000 },
  { level: 19, turnover: 90000000 },
  { level: 20, turnover: 100000000 }
];

// Считаем активных рефералов первой линии (с инвестициями)
function countActiveDirects(tree) {
  if (!tree || !Array.isArray(tree)) return 0;
  return tree.filter(child => child.investments && Array.isArray(child.investments) && child.investments.length > 0).length;
}

// Новый расчёт комиссий по уровням с учётом условий
function getReferralCommissions(tree, userId) {
  let commissions = Array(8).fill(0); // [0, lvl1, lvl2, ... lvl7]
  const activeDirects = countActiveDirects(tree);
  
  function walk(nodes, currentLevel) {
    if (!nodes || !Array.isArray(nodes) || currentLevel > 7) return;
    
    nodes.forEach(child => {
      if (child.investments && Array.isArray(child.investments)) {
        // Проверяем, открыт ли уровень
        const unlocked = currentLevel === 1 || activeDirects >= REFERRAL_LEVELS[currentLevel-1].requiredDirects;
        if (unlocked) {
          const sum = child.investments.reduce((a, b) => a + (b.amount || 0), 0);
          commissions[currentLevel] += sum * (REFERRAL_LEVELS[currentLevel-1].percent / 100);
        }
      }
      if (child.children && Array.isArray(child.children)) {
        walk(child.children, currentLevel + 1);
      }
    });
  }
  
  // Начать с корневого уровня
  if (tree && Array.isArray(tree)) {
    walk(tree, 1);
  }
  
  return {commissions, activeDirects};
}

export default function ReferralSystemPage({ userData, referralTree, referralLink, packages, transactions, sponsor, currentRank }) {
  const [openLinesTournover, setOpenLinesTournover] = useState(0);
  const [actualRank, setActualRank] = useState(1);
  const [nextRankData, setNextRankData] = useState(null);
  const [currentRankData, setCurrentRankData] = useState(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [remainingTurnover, setRemainingTurnover] = useState(0);
  
  // Добавляем ref для отслеживания обновлений
  const remainingTurnoverRef = useRef(0);

  useEffect(() => {
    const fetchRankData = async () => {
      try {
        const token = localStorage.getItem('token');
        const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${API}/api/rank-rewards`, { 
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        setOpenLinesTournover(data.turnover || 0);
        setActualRank(data.currentRank?.level ?? 0); // Было: || 1, стало: ?? 0
        // Используем данные из API вместо локального массива
        const currentRankData = data.currentRank || { level: 0, name: 'No rank', turnover: 0 };
        const nextRankData = data.nextRank;
        setCurrentRankData(currentRankData);
        setNextRankData(nextRankData);
        
        // Вычисляем прогресс
        if (nextRankData) {
          const calculatedRemainingTurnover = Math.max(0, nextRankData.turnover - (data.turnover || 0));
          const calculatedProgressPercentage = Math.min(100, Math.max(0, Math.round(((data.turnover || 0) / nextRankData.turnover) * 100)));
          
          remainingTurnoverRef.current = calculatedRemainingTurnover;
          setRemainingTurnover(calculatedRemainingTurnover);
          setProgressPercentage(calculatedProgressPercentage);
        } else {
          // Достигнут максимальный ранг (уровень 20)
          setRemainingTurnover(0);
          setProgressPercentage(100);
        }
      } catch (error) {
        console.error('Error fetching rank data:', error);
        // Set default values on error
        setOpenLinesTournover(0);
        setActualRank(0); // Было: 1, стало: 0
        setCurrentRankData({ level: 0, name: 'No rank', turnover: 0 });
        setNextRankData(null);
        setRemainingTurnover(0);
        setProgressPercentage(0);
      }
    };
    
    fetchRankData();
  }, []);

  const directReferrals = getDirectReferrals(referralTree);
  const totalTeam = getTotalTeam(referralTree);
  const teamTurnover = getTeamTurnover(referralTree);
  

  
  // Базовые вычисления
  const personalInvested = transactions.filter(t => t.type === 'INVESTMENT').reduce((a, b) => a + b.amount, 0);
  const requiredPersonal = 100;
  const {commissions, activeDirects} = getReferralCommissions(referralTree, userData.id);
  const yourSales = commissions[1];
  const teamSales = commissions.slice(2).reduce((a, b) => a + b, 0);
  

  




  const [teamTab, setTeamTab] = useState('structure');
  const [search, setSearch] = useState('');

  // Collect flat list of referrals with levels
  function flattenTree(nodes, level = 1, parentDate = null) {
    if (!nodes || !Array.isArray(nodes)) return [];
    let arr = [];
    nodes.forEach(child => {
      arr.push({
        firstName: child.username?.split(' ')[0] || '',
        lastName: child.username?.split(' ')[1] || '',
        email: child.email || '',
        level,
        date: child.createdAt || parentDate || '',
      });
      if (child.children && Array.isArray(child.children)) {
        arr = arr.concat(flattenTree(child.children, level + 1, child.createdAt || parentDate));
      }
    });
    return arr;
  }
  const me = (function findMe(node) {
    if (!node) return null;
    if (node.id === userData.id) return node;
    if (node.children) for (let c of node.children) { const f = findMe(c); if (f) return f; }
    return null;
  })(referralTree);
  const flatTeam = me ? flattenTree(me) : [];
  const filteredTeam = flatTeam.filter(r =>
    r.firstName.toLowerCase().includes(search.toLowerCase()) ||
    r.lastName.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 4.1 Team turnover */}
      <Card>
        <div className="text-2xl font-bold text-white mb-4">Team turnover</div>
        <div className="text-gray-400 text-sm">Total team turnover</div>
        <div className="text-white mb-2">${openLinesTournover.toLocaleString()}</div>
        <div className="text-gray-400 text-sm">Required for next level</div>
        <div className="text-white">
          {nextRankData ? `$${remainingTurnover.toLocaleString()}` : 'Max rank reached'}
        </div>
      </Card>
      {/* 4.2 Your team */}
      <Card>
        <div className="text-2xl font-bold text-white mb-4">Your team</div>
        <div className="text-gray-400 text-sm">Direct referrals</div>
        <div className="text-white mb-2">{directReferrals}</div>
        <div className="text-gray-400 text-sm">Total team</div>
        <div className="text-white">{totalTeam}</div>
      </Card>
      {/* 4.3 Your sponsor */}
      <Card>
        <div className="text-2xl font-bold text-white mb-4">Your sponsor</div>
        {sponsor ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center text-xl text-white">
                {sponsor.username?.[0] || 'S'}
              </div>
              <div className="flex flex-col">
                <div className="text-white">{sponsor.username}</div>
                <div className="text-gray-400 text-sm">{sponsor.email}</div>
              </div>
            </div>
          </div>
        ) : <div className="text-gray-400">No sponsor</div>}
      </Card>
      {/* 4.4 Your profile */}
      <Card>
        <div className="text-2xl font-bold text-white mb-4">Your profile</div>
        <div className="mb-4 flex items-center gap-4">
          <div className="relative">
            {userData.avatar ? (
              <img 
                src={userData.avatar} 
                alt="Avatar" 
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gray-700 flex items-center justify-center text-2xl text-white">
                {userData.username?.[0] || userData.name?.[0] || 'U'}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold text-white">{userData.username || userData.name}</div>
            <div className="text-gray-400 text-sm">{userData.email}</div>
            <div className="text-orange-400 text-sm">
              {actualRank === 0 ? 'No rank' : `Rank ${actualRank}`}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-[rgb(249,115,22)] text-sm mb-1">Referral link</div>
            <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg p-2">
              <span className="text-gray-300 text-sm flex-1 truncate">{referralLink}</span>
              <button className="text-orange-400 hover:text-orange-300 glass-button px-2 py-1 rounded text-xs" onClick={() => {navigator.clipboard.writeText(referralLink);}}>Copy</button>
            </div>
          </div>
        </div>
      </Card>
      {/* 4.5 Personal investment */}
      <Card>
        <div className="text-2xl font-bold text-white mb-4">Personal investment</div>
        <div className="text-[rgb(249,115,22)] text-sm">Already Invested</div>
        <div className="text-white mb-2">${personalInvested.toFixed(2)}</div>
        <div className="text-[rgb(249,115,22)] text-sm">From My Packages</div>
        <div className="text-white">${transactions.filter(t => t.type === 'DAILY_PROFIT' || t.type === 'BONUS').reduce((sum, t) => sum + Number(t.amount), 0).toFixed(2)}</div>
      </Card>
      {/* 4.6 Statistics */}
      <Card>
        <div className="text-2xl font-bold text-white mb-4">Statistics</div>
        <div className="text-gray-400 text-sm">Your sales commission</div>
        <div className="text-white mb-2">${yourSales.toFixed(2)}</div>
        <div className="text-gray-400 text-sm">Team sales commission</div>
        <div className="text-white">${teamSales.toFixed(2)}</div>
      </Card>
      {/* Progress Bar */}
      <Card className="col-span-full">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Progress to next rank</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-orange-400 font-semibold">
            {currentRankData?.level === 0 ? 'No rank' : `Rank ${currentRankData?.level || ''}${currentRankData?.name ? ` (${currentRankData.name})` : ''}`}
          </span>
          <span className="text-xs text-orange-400 font-semibold">
            {nextRankData ? `Rank ${nextRankData.level}${nextRankData.name ? ` (${nextRankData.name})` : ''}` : 'Max rank'}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {nextRankData
            ? `$${openLinesTournover.toLocaleString()} / $${nextRankData.turnover.toLocaleString()}`
            : <span className="text-green-400">Maximum rank achieved! 🎉</span>
          }
        </div>
        <div className="text-center mt-2 text-sm">
          <span className="text-gray-400">
            {nextRankData ? (
              <>
                ${remainingTurnover.toLocaleString()} more needed for next rank
                <span className="text-orange-400 ml-2">({progressPercentage}% complete)</span>
              </>
            ) : (
              <span className="text-green-400">Maximum rank achieved! 🎉</span>
            )}
          </span>
        </div>
      </Card>
      {/* Удалена таблица уровней реферальной системы */}
      {/* 4.8 Уровни реферальной системы */}
      {/* <div className="col-span-full mt-8">
        <h4 className="text-white font-semibold mb-2">Уровни реферальной системы</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2">Линия</th>
                <th className="text-left py-2">%</th>
                <th className="text-left py-2">Бонус</th>
                <th className="text-left py-2">Статус</th>
                <th className="text-left py-2">Условие</th>
              </tr>
            </thead>
            <tbody>
              {REFERRAL_LEVELS.map((lvl, i) => {
                const unlocked = i === 0 || activeDirects >= lvl.requiredDirects;
                return (
                  <tr key={lvl.level} className="border-b border-gray-800">
                    <td className="py-2 text-white">{lvl.level}</td>
                    <td className="py-2 text-orange-400">{lvl.percent}%</td>
                    <td className="py-2 text-white">${commissions[lvl.level]?.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                                      <td className={`py-2 ${unlocked ? 'text-green-400' : 'text-red-400'}`}>{unlocked ? 'Open' : 'Closed'}</td>
                  <td className="py-2 text-gray-300">{lvl.requiredDirects === 0 ? 'Always available' : `Need active: ${lvl.requiredDirects}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
      </div>
        <div className="text-gray-400 text-xs mt-2">Активных в 1-й линии: {activeDirects}</div>
      </div> */}
    </div>
  );
} 