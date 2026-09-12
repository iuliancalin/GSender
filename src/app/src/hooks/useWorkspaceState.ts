import { useState, useEffect, useCallback } from 'react';
import isEqual from 'lodash/isEqual';

import store from 'app/store';
import { State } from 'app/store/definitions';

// Create a singleton subscription manager
// This ensures we only have ONE listener to the store, regardless of how many components use the hook
const workspaceSubscription = {
    get currentWorkspace(): State['workspace'] {
        return store.get('workspace', {});
    },
    listeners: new Set<(workspace: State['workspace']) => void>(),
    initialized: false,

    init() {
        if (this.initialized) return;

        const handleUpdate = (data: State) => {
            const newWorkspace = data?.workspace || store.get('workspace', {});
            // Notify all subscribers
            this.listeners.forEach((listener) => {
                listener(newWorkspace);
            });
        };

        // Set up store listeners for all update pathways
        store.on('change', handleUpdate);
        store.on('replace', handleUpdate);

        this.initialized = true;
    },

    subscribe(callback: (workspace: State['workspace']) => void) {
        this.init();
        this.listeners.add(callback);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(callback);
        };
    },
};

export const useWorkspaceState = () => {
    const [workspace, setWorkspace] = useState<State['workspace']>(() =>
        store.get('workspace', {}),
    );

    // Create a stable callback function that won't change on re-renders
    const updateWorkspace = useCallback((newWorkspace: State['workspace']) => {
        setWorkspace((prev) => (isEqual(prev, newWorkspace) ? prev : newWorkspace));
    }, []);

    useEffect(() => {
        // Ensure fresh state from store on mount
        const current = store.get('workspace', {});
        setWorkspace((prev) => (isEqual(prev, current) ? prev : current));

        // Subscribe to workspace changes
        const unsubscribe = workspaceSubscription.subscribe(updateWorkspace);

        // Clean up subscription when component unmounts
        return unsubscribe;
    }, [updateWorkspace]);

    return workspace;
};
