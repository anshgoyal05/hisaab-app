import React, { useEffect, useState } from 'react';
import { Search, UserPlus, Users, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { PersonDetailModal } from '../components/modals/PersonDetailModal.js';
import { apiRequest } from '../lib/api.js';
import { formatMoney } from '@hisaab/shared';

export interface PeopleScreenProps {
  initialFilter?: 'all' | 'owes_me' | 'i_owe' | 'settled';
}

export const PeopleScreen: React.FC<PeopleScreenProps> = ({ initialFilter = 'all' }) => {
  const [people, setPeople] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'owes_me' | 'i_owe' | 'settled'>(initialFilter);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Add Friend State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newColor] = useState('#145C53');
  const [isAdding, setIsAdding] = useState(false);

  const fetchPeople = () => {
    apiRequest('/people')
      .then((res) => setPeople(res.people || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      await apiRequest('/people', {
        method: 'POST',
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim() || null,
          avatarColor: newColor,
        }),
      });
      setNewName('');
      setNewPhone('');
      setIsAddOpen(false);
      fetchPeople();
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  // Compute receivables & payables
  let totalReceivable = 0;
  let totalPayable = 0;
  for (const p of people) {
    if (p.netBalanceMinor > 0) totalReceivable += p.netBalanceMinor;
    if (p.netBalanceMinor < 0) totalPayable += Math.abs(p.netBalanceMinor);
  }

  // Filter friends list
  const filteredPeople = people.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === 'owes_me') return p.netBalanceMinor > 0;
    if (filter === 'i_owe') return p.netBalanceMinor < 0;
    if (filter === 'settled') return p.netBalanceMinor === 0;
    return true;
  });

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Header & Add Friend */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            People & Ledgers
          </h2>
          <p className="text-xs text-text-secondary">
            Keep track of who owes whom with your friends and batchmates.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          className="gap-1.5"
          onClick={() => setIsAddOpen(true)}
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Friend</span>
        </Button>
      </div>

      {/* Summary Receivable & Payable Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="p-4 rounded-card bg-balance-owed-surface border border-balance-owed/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-balance-owed">
              You are owed
            </span>
            <ArrowUpRight className="w-4 h-4 text-balance-owed" />
          </div>
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-balance-owed mt-2">
            {formatMoney(totalReceivable)}
          </span>
        </div>

        <div className="p-4 rounded-card bg-balance-iowe-surface border border-balance-iowe/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-balance-iowe">
              You owe
            </span>
            <ArrowDownLeft className="w-4 h-4 text-balance-iowe" />
          </div>
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-balance-iowe mt-2">
            {formatMoney(totalPayable)}
          </span>
        </div>
      </div>

      {/* Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-text-secondary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends by name..."
            className="pl-9 py-2 text-xs"
          />
        </div>

        <div className="flex p-1 bg-surface border border-border-rule rounded-control gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'owes_me', label: 'Owes me' },
            { id: 'i_owe', label: 'I owe' },
            { id: 'settled', label: 'Settled' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-control text-xs font-medium whitespace-nowrap transition-colors ${
                filter === tab.id
                  ? 'bg-action-primary text-white dark:text-[#102622] shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Friends List */}
      <div className="flex flex-col gap-2">
        {filteredPeople.length === 0 ? (
          <div className="p-10 text-center bg-surface border border-border-rule rounded-card flex flex-col items-center">
            <Users className="w-8 h-8 text-text-secondary/50 mb-2" />
            <span className="text-sm font-semibold text-text-primary">
              No friends found
            </span>
            <span className="text-xs text-text-secondary mt-0.5">
              {search ? 'Try a different search term.' : 'Add your roommates and friends to start splitting.'}
            </span>
          </div>
        ) : (
          filteredPeople.map((person) => {
            const isOwed = person.netBalanceMinor > 0;
            const isOwe = person.netBalanceMinor < 0;

            return (
              <div
                key={person.id}
                onClick={() => {
                  setSelectedPersonId(person.id);
                  setIsDetailOpen(true);
                }}
                className="p-3.5 bg-surface border border-border-rule hover:border-action-primary/30 rounded-card flex items-center justify-between transition-all cursor-pointer select-none active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={person.name} size="md" />
                  <div>
                    <span className="text-sm font-semibold text-text-primary block">
                      {person.name}
                    </span>
                    {person.phone ? (
                      <span className="text-xs text-text-secondary">{person.phone}</span>
                    ) : null}
                  </div>
                </div>

                <div className="text-right">
                  {isOwed ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-balance-owed-surface text-balance-owed">
                      +{formatMoney(person.netBalanceMinor)}
                    </span>
                  ) : isOwe ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-balance-iowe-surface text-balance-iowe">
                      -{formatMoney(Math.abs(person.netBalanceMinor))}
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-canvas text-text-secondary">
                      Settled
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Friend Modal */}
      {isAddOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsAddOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm bg-surface p-6 rounded-card border border-border-rule shadow-modal">
            <h3 className="text-base font-semibold text-text-primary mb-4">
              Add New Friend
            </h3>
            <form onSubmit={handleAddFriend} className="flex flex-col gap-4">
              <Input
                label="Friend's Name"
                placeholder="e.g. Rahul Sharma"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              <Input
                label="Phone (Optional)"
                placeholder="+91 98765 43210"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
              <Button type="submit" variant="primary" isLoading={isAdding}>
                Save Friend
              </Button>
            </form>
          </div>
        </div>
      ) : null}

      {/* Person Detail Modal */}
      <PersonDetailModal
        personId={selectedPersonId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedPersonId(null);
        }}
        onBalanceUpdated={fetchPeople}
      />
    </div>
  );
};
