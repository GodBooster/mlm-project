import React, { useState } from 'react';
const REFERRAL_LEVELS = [
  { level: 1, percent: 10, requiredDirects: 0 },
  { level: 2, percent: 5, requiredDirects: 2 },
  { level: 3, percent: 5, requiredDirects: 5 },
  { level: 4, percent: 5, requiredDirects: 10 },
  { level: 5, percent: 5, requiredDirects: 15 },
  { level: 6, percent: 3, requiredDirects: 20 },
  { level: 7, percent: 2, requiredDirects: 25 },
];

function countActiveDirects(tree) {
  if (!tree || !Array.isArray(tree)) return 0;
  return tree.filter(child => child.investments && Array.isArray(child.investments) && child.investments.length > 0).length;
}

function getReferralCommissions(tree, userId) {
  let commissions = Array(8).fill(0); // [0, lvl1, lvl2, ... lvl7]
  const activeDirects = countActiveDirects(tree);
  
  function walk(nodes, currentLevel) {
    if (!nodes || !Array.isArray(nodes) || currentLevel > 7) return;
    
    nodes.forEach(child => {
      if (child.investments && Array.isArray(child.investments)) {
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
  
  if (tree && Array.isArray(tree)) {
    walk(tree, 1);
  }
  
  return {commissions, activeDirects};
}
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
const Card = ({ children, className = "" }) => (
  <div className={`glass-card glass-card-hover p-6 animate-fade-in-up ${className}`}>{children}</div>
);
export default function TeamPage({ referralTree, userData, tableView, currentRank }) {
  const [teamTab, setTeamTab] = useState('structure');
  const [search, setSearch] = useState('');
  const {commissions, activeDirects} = getReferralCommissions(referralTree, userData.id);
  const flatTeam = referralTree && Array.isArray(referralTree) ? flattenTree(referralTree) : [];
  const teamData = tableView && tableView.length > 0 ? tableView : flatTeam;
  
  // Debug information
  console.log('TeamPage - referralTree:', referralTree);
  console.log('TeamPage - flatTeam:', flatTeam);
  console.log('TeamPage - teamData:', teamData);
  const filteredTeam = teamData.filter(r =>
    (r.firstName?.toLowerCase?.() || r.name?.split?.(' ')[0]?.toLowerCase?.() || '').includes(search.toLowerCase()) ||
    (r.lastName?.toLowerCase?.() || r.name?.split?.(' ')[1]?.toLowerCase?.() || '').includes(search.toLowerCase()) ||
    (r.email?.toLowerCase?.() || '').includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={() => setTeamTab('structure')} className={`px-4 py-2 rounded-lg glass-button ${teamTab === 'structure' ? 'text-white' : 'text-gray-300'}`}>Structure view</button>
        <button onClick={() => setTeamTab('table')} className={`px-4 py-2 rounded-lg glass-button ${teamTab === 'table' ? 'text-white' : 'text-gray-300'}`}>Table view</button>
      </div>
      {teamTab === 'structure' && (
        <Card>
          <h4 className="text-xl font-semibold text-white mb-4">Bonus structure</h4>
          <div className="overflow-x-auto max-h-[460px] sm:max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="w-full text-xs sm:text-sm min-w-[200px]">
              <thead className="sticky top-0 bg-gray-900/80">
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-3 px-3 min-w-[40px] whitespace-normal break-words">Level</th>
                  <th className="text-left py-3 px-3 min-w-[60px] whitespace-normal break-words">Percent</th>
                  <th className="text-left py-3 px-3 min-w-[80px] whitespace-normal break-words">Bonus sum</th>
                  <th className="text-left py-3 px-3 min-w-[60px] whitespace-normal break-words">Status</th>
                  <th className="text-left py-3 px-3 min-w-[100px] whitespace-normal break-words">Condition</th>
                </tr>
              </thead>
              <tbody>
                {REFERRAL_LEVELS.map((lvl, i) => {
                  const unlocked = i === 0 || activeDirects >= lvl.requiredDirects;
                  return (
                    <tr key={lvl.level} className="border-b border-gray-800">
                      <td className="py-2 px-1 text-white min-w-[40px] whitespace-normal break-words">{lvl.level}</td>
                      <td className="py-2 px-1 text-orange-400 min-w-[60px] whitespace-normal break-words">{lvl.percent}%</td>
                      <td className="py-2 px-1 text-white min-w-[80px] whitespace-normal break-words">${commissions[lvl.level]?.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                      <td className={`py-2 px-1 min-w-[60px] whitespace-normal break-words ${unlocked ? 'text-green-400' : 'text-red-400'}`}>{unlocked ? 'Open' : 'Closed'}</td>
                      <td className="py-2 px-1 text-gray-300 min-w-[100px] whitespace-normal break-words">{lvl.requiredDirects === 0 ? 'Always available' : `Need active referrals in 1st line: ${lvl.requiredDirects}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-xs sm:text-lg font-bold flex flex-col sm:flex-row gap-2">
            <span className="text-gray-400 whitespace-nowrap">Active referrals in 1st line now:</span>
            <span className="text-green-400">{activeDirects}</span>
          </div>
        </Card>
      )}
      {teamTab === 'table' && (
        <Card>
          <h4 className="text-xl font-semibold text-white mb-4">Team Table</h4>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email" className="mb-4 w-full glass-input px-4 py-2 text-white focus:outline-none text-xs sm:text-sm" />
          <div className="overflow-x-auto max-h-[460px] sm:max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="w-full text-xs sm:text-sm min-w-[200px]">
              <thead className="sticky top-0 bg-gray-900/80">
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-3 px-3 min-w-[80px] whitespace-normal break-words">Username</th>
                  <th className="text-left py-3 px-3 min-w-[100px] whitespace-normal break-words">e-mail</th>
                  <th className="text-left py-3 px-3 min-w-[40px] whitespace-normal break-words">level</th>
                  <th className="text-left py-3 px-3 min-w-[60px] whitespace-normal break-words">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeam.map((r, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-2 px-1 text-white min-w-[80px] whitespace-normal break-words">{r.firstName ? r.firstName + (r.lastName ? ' ' + r.lastName : '') : r.name}</td>
                    <td className="py-2 px-1 text-white min-w-[100px] whitespace-normal break-words">{r.email}</td>
                    <td className="py-2 px-1 text-orange-400 min-w-[40px] whitespace-normal break-words">{r.level}</td>
                    <td className="py-2 px-1 text-gray-300 min-w-[60px] whitespace-normal break-words">
                      {r.date ? new Date(r.date).toLocaleDateString() : ''}
                    </td>
                  </tr>
                ))}
                {filteredTeam.length === 0 && (
                  <tr><td colSpan={4} className="text-gray-400 py-4 text-center text-xs sm:text-sm">No team members found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
} 