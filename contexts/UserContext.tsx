import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Plan, Usage, UserState, UsageType } from '../types';

const PLAN_LIMITS: Record<Plan, Usage> = {
    free: {
        generate: 3,
        edit: 3,
        reformat: 2,
        designer: 1,
    },
    creator: { // Exemplo de plano pago, usando um sistema de 'créditos'
        generate: 100,
        edit: 100,
        reformat: 100,
        designer: 100,
    },
    pro: { // Ilimitado
        generate: Infinity,
        edit: Infinity,
        reformat: Infinity,
        designer: Infinity,
    }
};

const defaultUserState: UserState = {
    plan: 'free',
    usage: { ...PLAN_LIMITS.free },
    lastReset: Date.now(),
};

interface UserContextType {
    user: UserState;
    consumeUsage: (type: UsageType) => void;
    changePlan: (newPlan: Plan) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserState>(() => {
        try {
            const storedUser = localStorage.getItem('martins-design-user');
            if (storedUser) {
                const parsedUser: UserState = JSON.parse(storedUser);
                // Check for daily reset
                const now = Date.now();
                const lastReset = new Date(parsedUser.lastReset);
                const nextReset = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate() + 1);

                if (now >= nextReset.getTime()) {
                    return {
                        ...parsedUser,
                        usage: { ...PLAN_LIMITS[parsedUser.plan] },
                        lastReset: now,
                    };
                }
                return parsedUser;
            }
        } catch (error) {
            console.error("Failed to parse user from localStorage", error);
        }
        return defaultUserState;
    });

    useEffect(() => {
        try {
            localStorage.setItem('martins-design-user', JSON.stringify(user));
        } catch (error) {
            console.error("Failed to save user to localStorage", error);
        }
    }, [user]);
    
    const consumeUsage = (type: UsageType) => {
        setUser(currentUser => {
            if (currentUser.plan === 'pro') return currentUser; // Pro plan has infinite usage
            
            const newUsage = { ...currentUser.usage };
            if (newUsage[type] > 0) {
                newUsage[type] -= 1;
            }
            return { ...currentUser, usage: newUsage };
        });
    };

    const changePlan = (newPlan: Plan) => {
        setUser(currentUser => ({
            ...currentUser,
            plan: newPlan,
            usage: { ...PLAN_LIMITS[newPlan] }, // Reset usage when plan changes
            lastReset: Date.now(), // Reset timer as well
        }));
    };

    return (
        <UserContext.Provider value={{ user, consumeUsage, changePlan }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = (): UserContextType => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
