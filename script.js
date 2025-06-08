document.addEventListener('DOMContentLoaded', () => {
    // --- Variáveis Globais e Inicialização ---
    let currentMonthKey; // FormatogetFullYear()-MM
    let allMonthsData = {}; // Objeto para armazenar dados de todos os meses

    const monthSelect = document.getElementById('monthSelect');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const addMonthBtn = document.getElementById('addMonth');
    const exportDataBtn = document.getElementById('exportData');
    const importDataInput = document.getElementById('importDataInput');
    const importDataButton = document.getElementById('importDataButton');
    const tabButtons = document.querySelectorAll('.tab-button'); // Única declaração para tabButtons
    const tabContents = document.querySelectorAll('.tab-content');

    // Resumo
    const totalIncomeSummary = document.getElementById('totalIncomeSummary');
    const totalExpensesSummary = document.getElementById('totalExpensesSummary');
    const currentBalanceSummary = document.getElementById('currentBalanceSummary');
    const totalRegularSummary = document.getElementById('totalRegularSummary');
    const totalVouchersSummary = document.getElementById('totalVouchersSummary');
    const categorySummaryTableBody = document.querySelector('#categorySummaryTable tbody');
    const paymentMethodSummaryTableBody = document.querySelector('#paymentMethodSummaryTable tbody');

    // Tabelas
    const fixedExpensesTableBody = document.querySelector('#fixedExpensesTable tbody');
    const monthlyExpensesTableBody = document.querySelector('#monthlyExpensesTable tbody');
    const incomeTableBody = document.querySelector('#incomeTable tbody');
    const installmentsTableBody = document.querySelector('#installmentsTable tbody');

    // Modais
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.modal .close-button');
    const addButtons = document.querySelectorAll('.add-button');
    const quickActionButtons = document.querySelectorAll('.action-actions button'); // Corrigido de .action-buttons para .action-actions se for este o problema

    // Forms
    const fixedExpenseForm = document.getElementById('fixedExpenseForm');
    const monthlyExpenseForm = document.getElementById('monthlyExpenseForm');
    const incomeForm = document.getElementById('incomeForm');
    const installmentForm = document.getElementById('installmentForm');
    const categoryForm = document.getElementById('categoryForm');
    const paymentMethodForm = document.getElementById('paymentMethodForm');

    // Campos de seleção para categorias e formas de pagamento
    const fixedExpensePaymentMethodSelect = document.getElementById('fixedExpensePaymentMethod');
    const fixedExpenseCategorySelect = document.getElementById('fixedExpenseCategory');
    const monthlyExpensePaymentMethodSelect = document.getElementById('monthlyExpensePaymentMethod');
    const monthlyExpenseCategorySelect = document.getElementById('monthlyExpenseCategory'); // Corrigido: Removido 'document = '
    const incomeCategorySelect = document.getElementById('incomeCategory');
    const installmentPaymentMethodSelect = document.getElementById('installmentPaymentMethod');
    const installmentCategorySelect = document.getElementById('installmentCategory');
    const categoryTypeSelect = document.getElementById('categoryType');
    const expectedExpenseDiv = document.getElementById('expectedExpenseDiv');
    const paymentMethodNameInput = document.getElementById('paymentMethodName');
    const initialBalanceDiv = document.getElementById('initialBalanceDiv');
    const paymentMethodColorInput = document.getElementById('paymentMethodColor'); // IMPORTANTE: Variável para o input de cor da forma de pagamento

    // Listas de gerenciamento
    const categoryList = document.getElementById('categoryList');
    const paymentMethodList = document.getElementById('paymentMethodList');

    // Confirm Modal
    const confirmModal = document.getElementById('confirmModal');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmYesBtn = document.getElementById('confirmYes');
    const confirmNoBtn = document.getElementById('confirmNo');
    let confirmCallback = null;

    // Chart.js
    let expensesChart;

    // --- Funções de Utilitário ---

    // Formata o valor para moeda BRL
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    // Gera um ID único
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

    // Função auxiliar para determinar a cor de contraste do texto (para categorias e formas de pagamento)
    function getContrastColor(hexcolor) {
        if (!hexcolor) return '#000';
        if (hexcolor.length === 4) {
            hexcolor = '#' + hexcolor[1] + hexcolor[1] + hexcolor[2] + hexcolor[2] + hexcolor[3] + hexcolor[3];
        }
        var r = parseInt(hexcolor.substr(1, 2), 16);
        var g = parseInt(hexcolor.substr(3, 2), 16);
        var b = parseInt(hexcolor.substr(5, 2), 16);
        var y = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (y >= 128) ? 'black' : 'white';
    }

    // --- Funções de LocalStorage ---

    const loadData = () => {
        const data = localStorage.getItem('financialData');
        if (data) {
            allMonthsData = JSON.parse(data);
            // Garante que categorias e formas de pagamento tenham todas as propriedades esperadas, mesmo de dados antigos
            Object.values(allMonthsData).forEach(monthData => {
                monthData.categories = monthData.categories.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    color: cat.color || '#cccccc', // Default color
                    type: cat.type,
                    expectedExpense: cat.expectedExpense || 0
                }));
                monthData.paymentMethods = monthData.paymentMethods.map(pm => ({
                    id: pm.id,
                    name: pm.name,
                    color: pm.color || '#cccccc', // IMPORTANTE: Garante cor padrão para formas de pagamento ao carregar
                    isVoucher: pm.isVoucher || false,
                    initialBalance: pm.initialBalance || 0
                }));
            });
        } else {
            // Inicializa com dados básicos se não houver nada
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();
            currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
            allMonthsData[currentMonthKey] = {
                fixedExpenses: [],
                monthlyExpenses: [],
                income: [],
                installments: [],
                categories: [
                    { id: 'cat-1', name: 'Salário', color: '#8BC34A', type: 'income', expectedExpense: 0 },
                    { id: 'cat-2', name: 'Alimentação', color: '#FFEB3B', type: 'expense', expectedExpense: 500 },
                    { id: 'cat-3', name: 'Transporte', color: '#2196F3', type: 'expense', expectedExpense: 200 },
                    { id: 'cat-4', name: 'Moradia', color: '#FF9800', type: 'expense', expectedExpense: 800 }
                ],
                paymentMethods: [
                    { id: 'pm-1', name: 'Dinheiro', color: '#ADD8E6' }, // Cores iniciais para exemplos
                    { id: 'pm-2', name: 'Cartão de Crédito', color: '#90EE90' },
                    { id: 'pm-3', name: 'Cartão de Débito', color: '#FFD700' },
                    { id: 'pm-4', name: 'Vale Alimentação', isVoucher: true, initialBalance: 500, color: '#FF6347' }
                ]
            };
        }
        // Define o mês atual se não estiver definido ou não existir
        if (!currentMonthKey || !allMonthsData[currentMonthKey]) {
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();
            const newMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
            if (allMonthsData[newMonthKey]) {
                currentMonthKey = newMonthKey;
            } else {
                const firstMonthKey = Object.keys(allMonthsData).sort()[0];
                if (firstMonthKey) {
                    currentMonthKey = firstMonthKey;
                } else {
                    currentMonthKey = newMonthKey; // Cria se for o primeiro
                    allMonthsData[currentMonthKey] = {
                        fixedExpenses: [], monthlyExpenses: [], income: [], installments: [],
                        categories: [], paymentMethods: []
                    };
                }
            }
        }
    };

    const saveData = () => {
        localStorage.setItem('financialData', JSON.stringify(allMonthsData));
    };

    const getCurrentMonthData = () => {
        return allMonthsData[currentMonthKey];
    };

    // --- Funções de Navegação de Mês ---

    const updateMonthSelect = () => {
        monthSelect.innerHTML = '';
        const sortedMonths = Object.keys(allMonthsData).sort((a, b) => {
            const [yearA, monthA] = a.split('-').map(Number);
            const [yearB, monthB] = b.split('-').map(Number);
            if (yearA !== yearB) return yearA - yearB;
            return monthA - monthB;
        });

        sortedMonths.forEach(monthKey => {
            const [year, month] = monthKey.split('-');
            const option = document.createElement('option');
            option.value = monthKey;
            option.textContent = `${new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long' })} / ${year}`;
            monthSelect.appendChild(option);
        });
        monthSelect.value = currentMonthKey;
    };

    const navigateMonth = (direction) => {
        const [currentYear, currentMonth] = currentMonthKey.split('-').map(Number);
        let newDate = new Date(currentYear, currentMonth - 1, 1);

        if (direction === 'prev') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }

        const newYear = newDate.getFullYear();
        const newMonth = String(newDate.getMonth() + 1).padStart(2, '0');
        const newMonthKey = `${newYear}-${newMonth}`;

        if (!allMonthsData[newMonthKey]) {
            // Se o mês não existe, cria ele (sem copiar dados, exceto categorias e formas de pagamento)
            const currentMonthData = getCurrentMonthData();
            allMonthsData[newMonthKey] = {
                fixedExpenses: [],
                monthlyExpenses: [],
                income: [],
                installments: [], // Parcelas não são copiadas aqui, elas migram
                categories: currentMonthData ? JSON.parse(JSON.stringify(currentMonthData.categories)) : [],
                paymentMethods: currentMonthData ? JSON.parse(JSON.stringify(currentMonthData.paymentMethods)) : []
            };
        }
        currentMonthKey = newMonthKey;
        saveData();
        updateMonthSelect();
        renderCurrentMonthData();
    };

    prevMonthBtn.addEventListener('click', () => navigateMonth('prev'));
    nextMonthBtn.addEventListener('click', () => navigateMonth('next'));
    monthSelect.addEventListener('change', (e) => {
        currentMonthKey = e.target.value;
        renderCurrentMonthData();
    });

    addMonthBtn.addEventListener('click', () => {
        const today = new Date();
        let year = today.getFullYear();
        let month = today.getMonth() + 1;
        let newMonthKey;

        // Encontrar o próximo mês que ainda não existe
        do {
            month++;
            if (month > 12) {
                month = 1;
                year++;
            }
            newMonthKey = `${year}-${String(month).padStart(2, '0')}`;
        } while (allMonthsData[newMonthKey]);

        // MENSAGEM DE CONFIRMAÇÃO ATUALIZADA AQUI:
        const confirmCopy = confirm("Deseja copiar dados (exceto parcelas, que migram automaticamente) do mês atual para o novo mês?");

        // APENAS PROSSEGUE SE O USUÁRIO CLICAR EM "OK" (confirmCopy é true)
        if (confirmCopy) {
            const currentMonthData = getCurrentMonthData();

            allMonthsData[newMonthKey] = {
                fixedExpenses: currentMonthData ? JSON.parse(JSON.stringify(currentMonthData.fixedExpenses.map(exp => ({ ...exp })))) : [],
                monthlyExpenses: currentMonthData ? JSON.parse(JSON.stringify(currentMonthData.monthlyExpenses.map(exp => ({ ...exp })))) : [],
                income: currentMonthData ? JSON.parse(JSON.stringify(currentMonthData.income.map(inc => ({ ...inc })))) : [],
                installments: [], // Parcelas não são copiadas diretamente ao criar um novo mês, elas migram
                categories: currentMonthData ? JSON.parse(JSON.stringify(currentMonthData.categories)) : [], // Sempre copia categorias
                paymentMethods: currentMonthData ? JSON.parse(JSON.stringify(currentMonthData.paymentMethods)) : [] // Sempre copia formas de pagamento
            };

            currentMonthKey = newMonthKey;
            saveData();
            updateMonthSelect();
            renderCurrentMonthData();
            alert(`Mês ${new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long' })} / ${year} adicionado com sucesso!`);
        } else {
            console.log("Criação de novo mês cancelada pelo usuário.");
        }
    });

    // --- Funções de Modais ---

    const openModal = (modalId, itemId = null, itemType = null) => {
        const modal = document.getElementById(modalId);
        modal.style.display = 'flex';
        resetForm(modalId); // Reseta o formulário antes de preencher para edição

        if (itemId && itemType) {
            const currentMonthData = getCurrentMonthData();
            let item;
            switch (itemType) {
                case 'fixedExpenses':
                    item = currentMonthData.fixedExpenses.find(exp => exp.id === itemId);
                    if (item) {
                        document.getElementById('fixedExpenseId').value = item.id;
                        document.getElementById('fixedExpenseName').value = item.name;
                        document.getElementById('fixedExpenseDate').value = item.date;
                        document.getElementById('fixedExpensePaymentMethod').value = item.paymentMethodId;
                        document.getElementById('fixedExpenseCategory').value = item.categoryId;
                        document.getElementById('fixedExpenseValue').value = item.value;
                    }
                    break;
                case 'monthlyExpenses':
                    item = currentMonthData.monthlyExpenses.find(exp => exp.id === itemId);
                    if (item) {
                        document.getElementById('monthlyExpenseId').value = item.id;
                        document.getElementById('monthlyExpenseName').value = item.name;
                        document.getElementById('monthlyExpenseDate').value = item.date;
                        document.getElementById('monthlyExpensePaymentMethod').value = item.paymentMethodId;
                        document.getElementById('monthlyExpenseCategory').value = item.categoryId;
                        document.getElementById('monthlyExpenseValue').value = item.value;
                    }
                    break;
                case 'income':
                    item = currentMonthData.income.find(inc => inc.id === itemId);
                    if (item) {
                        document.getElementById('incomeId').value = item.id;
                        document.getElementById('incomeName').value = item.name;
                        document.getElementById('incomeDate').value = item.date;
                        document.getElementById('incomeCategory').value = item.categoryId;
                        document.getElementById('incomeValue').value = item.value;
                    }
                    break;
                case 'installments':
                    item = currentMonthData.installments.find(inst => inst.id === itemId);
                    if (item) {
                        document.getElementById('installmentId').value = item.id;
                        document.getElementById('installmentName').value = item.name;
                        document.getElementById('installmentDate').value = item.originalDate;
                        document.getElementById('installmentTotal').value = item.totalInstallments;
                        document.getElementById('installmentPaymentMethod').value = item.paymentMethodId;
                        document.getElementById('installmentCategory').value = item.categoryId;
                        document.getElementById('installmentValue').value = item.valuePerInstallment;
                    }
                    break;
                case 'category':
                    item = currentMonthData.categories.find(cat => cat.id === itemId);
                    if (item) {
                        document.getElementById('categoryId').value = item.id;
                        document.getElementById('categoryName').value = item.name;
                        document.getElementById('categoryColor').value = item.color || '#cccccc';
                        document.getElementById('categoryType').value = item.type;
                        if (item.type === 'expense') {
                            expectedExpenseDiv.style.display = 'block';
                            document.getElementById('categoryExpectedExpense').value = item.expectedExpense || '';
                        } else {
                            expectedExpenseDiv.style.display = 'none';
                        }
                    }
                    break;
                case 'paymentMethod':
                    item = currentMonthData.paymentMethods.find(pm => pm.id === itemId);
                    if (item) {
                        document.getElementById('paymentMethodId').value = item.id;
                        document.getElementById('paymentMethodName').value = item.name;
                        paymentMethodColorInput.value = pm.color || '#cccccc'; // IMPORTANTE: Preencher campo de cor ao editar
                        if (pm.isVoucher) {
                            initialBalanceDiv.style.display = 'block';
                            document.getElementById('paymentMethodInitialBalance').value = item.initialBalance || '';
                        } else {
                            initialBalanceDiv.style.display = 'none';
                        }
                    }
                    break;
            }
        }
        populateSelects(); // Popula os selects do modal (categorias e formas de pagamento)
    };

    const closeModal = (modal) => {
        modal.style.display = 'none';
        resetForm(modal.id);
    };

    const resetForm = (modalId) => {
        const form = document.getElementById(modalId).querySelector('form');
        if (form) {
            form.reset();
            const idInput = form.querySelector('input[type="hidden"]');
            if (idInput) idInput.value = '';
            // Chamar renderCategoryList/renderPaymentMethodList aqui para atualizar a lista no modal
            if (modalId === 'categoryModal') {
                renderCategoryList(); // Re-renderiza a lista de categorias no modal
                expectedExpenseDiv.style.display = 'none'; // Esconde a expectativa ao resetar
                document.getElementById('categoryExpectedExpense').value = ''; // Limpa o valor
            }
            if (modalId === 'paymentMethodModal') {
                renderPaymentMethodList(); // Re-renderiza a lista de formas de pagamento no modal
                initialBalanceDiv.style.display = 'none'; // Esconde o saldo ao resetar
                document.getElementById('paymentMethodInitialBalance').value = ''; // Limpa o valor
            }
        }
    };

    // Event listeners para abrir modais
    addButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const modalId = e.target.dataset.modal;
            openModal(modalId);
        });
    });

    quickActionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const modalId = e.target.dataset.modal;
            openModal(modalId);
        });
    });

    // Event listeners para fechar modais
    closeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal'));
        });
    });

    window.addEventListener('click', (e) => {
        modals.forEach(modal => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });

    // Função de confirmação genérica
    const showConfirmModal = (message, callback) => {
        confirmMessage.textContent = message;
        confirmCallback = callback;
        confirmModal.style.display = 'flex';
    };

    confirmYesBtn.addEventListener('click', () => {
        if (confirmCallback) {
            confirmCallback(true); // Confirma a ação
        }
        confirmModal.style.display = 'none';
    });

    confirmNoBtn.addEventListener('click', () => {
        if (confirmCallback) {
            confirmCallback(false); // Nega a ação
        }
        confirmModal.style.display = 'none';
    });

    // --- Funções de Renderização de Dados ---

    const renderSummary = () => {
        const currentMonthData = getCurrentMonthData();
        if (!currentMonthData) return;

        let totalIncome = currentMonthData.income.reduce((sum, item) => sum + item.value, 0);
        let totalFixed = currentMonthData.fixedExpenses.reduce((sum, item) => sum + item.value, 0);
        let totalMonthly = currentMonthData.monthlyExpenses.reduce((sum, item) => sum + item.value, 0);
        let totalInstallments = currentMonthData.installments
            .filter(inst => inst.status === 'Ativa') // Apenas parcelas ativas são contadas
            .reduce((sum, item) => sum + item.valuePerInstallment, 0);

        let totalExpenses = totalFixed + totalMonthly + totalInstallments;
        let currentBalance = totalIncome - totalExpenses;

        totalIncomeSummary.textContent = formatCurrency(totalIncome);
        totalExpensesSummary.textContent = formatCurrency(totalExpenses);
        currentBalanceSummary.textContent = formatCurrency(currentBalance);
        currentBalanceSummary.className = currentBalance >= 0 ? 'balance-positive' : 'balance-negative';

        // Cálculo de Total Regular e Total Vales
        let totalRegular = 0;
        let totalVouchers = 0;

        const allExpenses = [
            ...currentMonthData.fixedExpenses,
            ...currentMonthData.monthlyExpenses,
            ...currentMonthData.installments.filter(inst => inst.status === 'Ativa')
        ];

        allExpenses.forEach(exp => {
            const paymentMethod = currentMonthData.paymentMethods.find(pm => pm.id === exp.paymentMethodId);
            // Verifica se é um vale pelo nome do método de pagamento (contém "vale" ou "ticket")
            if (paymentMethod && paymentMethod.isVoucher) {
                totalVouchers += exp.value || exp.valuePerInstallment;
            } else {
                totalRegular += exp.value || exp.valuePerInstallment;
            }
        });

        totalRegularSummary.textContent = formatCurrency(totalRegular);
        totalVouchersSummary.textContent = formatCurrency(totalVouchers);

        renderCategorySummary();
        renderPaymentMethodSummary();
    };

    const renderTable = (data, tableBody, type) => {
        tableBody.innerHTML = '';
        data.forEach(item => {
            const row = tableBody.insertRow();
            let paymentMethodName = '';
            let categoryName = '';
            const currentMonthData = getCurrentMonthData();

            if (item.paymentMethodId) {
                const pm = currentMonthData.paymentMethods.find(p => p.id === item.paymentMethodId);
                paymentMethodName = pm ? pm.name : 'Desconhecido';
            }
            if (item.categoryId) {
                const cat = currentMonthData.categories.find(c => c.id === item.categoryId);
                categoryName = cat ? cat.name : 'Desconhecido';
            }

            switch (type) {
                case 'fixedExpenses':
                    row.innerHTML = `
                        <td>${item.name}</td>
                        <td>${item.date}</td>
                        <td>${paymentMethodName}</td>
                        <td>${categoryName}</td>
                        <td>${formatCurrency(item.value)}</td>
                        <td>
                            <button onclick="editItem('${item.id}', 'fixedExpenses')">Editar</button>
                            <button onclick="deleteItem('${item.id}', 'fixedExpenses')">Excluir</button>
                        </td>
                    `;
                    break;
                case 'monthlyExpenses':
                    row.innerHTML = `
                        <td>${item.name}</td>
                        <td>${item.date}</td>
                        <td>${paymentMethodName}</td>
                        <td>${categoryName}</td>
                        <td>${formatCurrency(item.value)}</td>
                        <td>
                            <button onclick="editItem('${item.id}', 'monthlyExpenses')">Editar</button>
                            <button onclick="deleteItem('${item.id}', 'monthlyExpenses')">Excluir</button>
                        </td>
                    `;
                    break;
                case 'income':
                    row.innerHTML = `
                        <td>${item.name}</td>
                        <td>${item.date}</td>
                        <td>${categoryName}</td>
                        <td>${formatCurrency(item.value)}</td>
                        <td>
                            <button onclick="editItem('${item.id}', 'income')">Editar</button>
                            <button onclick="deleteItem('${item.id}', 'income')">Excluir</button>
                        </td>
                    `;
                    break;
                case 'installments':
                    row.innerHTML = `
                        <td>${item.name}</td>
                        <td>${item.currentDate}</td>
                        <td>${item.currentInstallment}/${item.totalInstallments}</td>
                        <td>${paymentMethodName}</td>
                        <td>${categoryName}</td>
                        <td>${formatCurrency(item.valuePerInstallment)}</td>
                        <td>${item.status}</td>
                        <td>
                            <button onclick="editItem('${item.id}', 'installments')">Editar</button>
                            <button onclick="deleteItem('${item.id}', 'installments')">Excluir</button>
                        </td>
                    `;
                    break;
            }
        });
    };

    const renderCategorySummary = () => {
        categorySummaryTableBody.innerHTML = '';
        const currentMonthData = getCurrentMonthData();
        const categories = currentMonthData.categories.filter(cat => cat.type === 'expense');

        let totalExpensesMonth = currentMonthData.fixedExpenses.reduce((sum, item) => sum + item.value, 0) +
                                 currentMonthData.monthlyExpenses.reduce((sum, item) => sum + item.value, 0) +
                                 currentMonthData.installments.filter(inst => inst.status === 'Ativa').reduce((sum, item) => sum + item.valuePerInstallment, 0);

        categories.forEach(category => {
            const categoryExpenses = [
                ...currentMonthData.fixedExpenses.filter(exp => exp.categoryId === category.id),
                ...currentMonthData.monthlyExpenses.filter(exp => exp.categoryId === category.id),
                ...currentMonthData.installments.filter(inst => inst.categoryId === category.id && inst.status === 'Ativa')
            ];
            const realExpense = categoryExpenses.reduce((sum, item) => sum + (item.value || item.valuePerInstallment), 0);
            const percentage = totalExpensesMonth > 0 ? (realExpense / totalExpensesMonth) * 100 : 0;
            const status = realExpense <= category.expectedExpense ? 'Dentro' : 'Acima';

            const row = categorySummaryTableBody.insertRow();
            row.innerHTML = `
                <td style="background-color: ${category.color || '#cccccc'}; color: ${getContrastColor(category.color)};">${category.name}</td>
                <td>${formatCurrency(category.expectedExpense || 0)}</td>
                <td>${formatCurrency(realExpense)}</td>
                <td>${percentage.toFixed(2)}%</td>
                <td>${status}</td>
            `;
        });
    };

    const renderPaymentMethodSummary = () => {
        paymentMethodSummaryTableBody.innerHTML = '';
        const currentMonthData = getCurrentMonthData();
        const paymentMethods = currentMonthData.paymentMethods;

        paymentMethods.forEach(pm => {
            let totalSpent = 0;
            let availableBalance = pm.isVoucher ? (pm.initialBalance || 0) : 0;

            const pmExpenses = [
                ...currentMonthData.fixedExpenses.filter(exp => exp.paymentMethodId === pm.id),
                ...currentMonthData.monthlyExpenses.filter(exp => exp.paymentMethodId === pm.id),
                ...currentMonthData.installments.filter(inst => inst.paymentMethodId === pm.id && inst.status === 'Ativa')
            ];
            totalSpent = pmExpenses.reduce((sum, item) => sum + (item.value || item.valuePerInstallment), 0);

            if (pm.isVoucher) {
                availableBalance -= totalSpent;
            }

            const row = paymentMethodSummaryTableBody.insertRow();
            // IMPORTANTE: Aplica a cor de fundo e a cor do texto no nome da forma de pagamento
            row.innerHTML = `
                <td style="background-color: ${pm.color || '#cccccc'}; color: ${getContrastColor(pm.color)};">${pm.name}</td>
                <td>${formatCurrency(totalSpent)}</td>
                <td>${pm.isVoucher ? formatCurrency(availableBalance) : 'N/A'}</td>
                <td>
                    ${pm.isVoucher ? `<button onclick="editPaymentMethodBalance('${pm.id}')">Editar Saldo</button>` : ''}
                </td>
            `;
        });
    };

    // Função para editar saldo do método de pagamento (especialmente vales)
    window.editPaymentMethodBalance = (paymentMethodId) => {
        const currentMonthData = getCurrentMonthData();
        const pm = currentMonthData.paymentMethods.find(p => p.id === paymentMethodId);
        if (pm && pm.isVoucher) {
            const newBalanceStr = prompt(`Informe o novo saldo inicial para ${pm.name}:`, pm.initialBalance || '');
            if (newBalanceStr !== null) {
                const newBalance = parseFloat(newBalanceStr);
                if (!isNaN(newBalance) && newBalance >= 0) {
                    pm.initialBalance = newBalance;
                    saveData();
                    renderSummary();
                } else {
                    alert('Valor inválido. Por favor, insira um número válido e não negativo.');
                }
            }
        }
    };


    const renderChart = () => {
        const currentMonthData = getCurrentMonthData();
        if (!currentMonthData) return;

        const expenseCategories = currentMonthData.categories.filter(cat => cat.type === 'expense');
        const categoryExpenses = {};

        expenseCategories.forEach(cat => categoryExpenses[cat.id] = 0);

        const allExpenses = [
            ...currentMonthData.fixedExpenses,
            ...currentMonthData.monthlyExpenses,
            ...currentMonthData.installments.filter(inst => inst.status === 'Ativa')
        ];

        allExpenses.forEach(exp => {
            if (exp.categoryId && categoryExpenses.hasOwnProperty(exp.categoryId)) {
                categoryExpenses[exp.categoryId] += (exp.value || exp.valuePerInstallment);
            }
        });

        const labels = expenseCategories.map(cat => cat.name);
        const data = expenseCategories.map(cat => categoryExpenses[cat.id]);
        const backgroundColors = expenseCategories.map(cat => cat.color || '#cccccc');

        const ctx = document.getElementById('expensesChart').getContext('2d');

        if (expensesChart) {
            expensesChart.destroy();
        }

        expensesChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += formatCurrency(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    };

    const renderCategoryList = () => {
        categoryList.innerHTML = '';
        const categories = getCurrentMonthData().categories;
        categories.forEach(cat => {
            const li = document.createElement('li');
            // IMPORTANTE: Aplica a cor de fundo e a cor do texto no nome da categoria
            li.innerHTML = `
                <span style="background-color: ${cat.color}; padding: 3px 8px; border-radius: 4px; color: ${getContrastColor(cat.color)};">${cat.name} (${cat.type === 'expense' ? 'Despesa' : 'Receita'}${cat.type === 'expense' ? ` - Exp.: ${formatCurrency(cat.expectedExpense || 0)}` : ''})</span>
                <div>
                    <button onclick="editItem('${cat.id}', 'category')">Editar</button>
                    <button onclick="deleteItem('${cat.id}', 'category')">Excluir</button>
                </div>
            `;
            categoryList.appendChild(li);
        });
    };

    const renderPaymentMethodList = () => {
        paymentMethodList.innerHTML = '';
        const paymentMethods = getCurrentMonthData().paymentMethods;
        paymentMethods.forEach(pm => {
            const li = document.createElement('li');
            // IMPORTANTE: Aplica a cor de fundo e a cor do texto no nome da forma de pagamento na lista de gerenciamento
            li.innerHTML = `
                <span style="background-color: ${pm.color || '#cccccc'}; padding: 3px 8px; border-radius: 4px; color: ${getContrastColor(pm.color)};">${pm.name} ${pm.isVoucher ? `(Vale - Saldo: ${formatCurrency(pm.initialBalance || 0)})` : ''}</span>
                <div>
                    <button onclick="editItem('${pm.id}', 'paymentMethod')">Editar</button>
                    <button onclick="deleteItem('${pm.id}', 'paymentMethod')">Excluir</button>
                </div>
            `;
            paymentMethodList.appendChild(li);
        });
    };

    const populateSelects = () => {
        const currentMonthData = getCurrentMonthData();
        const categories = currentMonthData.categories;
        const paymentMethods = currentMonthData.paymentMethods;

        const populateSelect = (selectElement, items, type) => {
            selectElement.innerHTML = '<option value="">Selecione...</option>';
            items.forEach(item => {
                if (type === 'income' && item.type !== 'income') return;
                if (['fixedExpense', 'monthlyExpense', 'installment'].includes(type) && item.type !== 'expense') return;

                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.name;
                selectElement.appendChild(option);
            });
        };

        populateSelect(fixedExpensePaymentMethodSelect, paymentMethods, 'paymentMethod');
        populateSelect(fixedExpenseCategorySelect, categories, 'fixedExpense');
        populateSelect(monthlyExpensePaymentMethodSelect, paymentMethods, 'paymentMethod');
        populateSelect(monthlyExpenseCategorySelect, categories, 'monthlyExpense');
        populateSelect(incomeCategorySelect, categories, 'income');
        populateSelect(installmentPaymentMethodSelect, paymentMethods, 'paymentMethod');
        populateSelect(installmentCategorySelect, categories, 'installment');
    };

    const renderCurrentMonthData = () => {
        // Assegura que o currentMonthKey está válido antes de carregar dados
        if (!currentMonthKey || !allMonthsData[currentMonthKey]) {
            // Se o mês atual não existe, navega para o primeiro mês disponível
            const firstMonthKey = Object.keys(allMonthsData).sort()[0];
            if (firstMonthKey) {
                currentMonthKey = firstMonthKey;
            } else {
                // Se não há meses, inicializa o mês atual
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                currentMonthKey = `${year}-${month}`;
                allMonthsData[currentMonthKey] = {
                    fixedExpenses: [], monthlyExpenses: [], income: [], installments: [],
                    categories: [], paymentMethods: []
                };
            }
            saveData();
            updateMonthSelect();
            renderCurrentMonthData(); // Chama novamente para renderizar o mês inicializado
            return;
        }

        // Migra parcelas para o mês atual (sempre antes de renderizar)
        migrateInstallments();

        const currentMonthData = getCurrentMonthData();
        renderTable(currentMonthData.fixedExpenses, fixedExpensesTableBody, 'fixedExpenses');
        renderTable(currentMonthData.monthlyExpenses, monthlyExpensesTableBody, 'monthlyExpenses'); // CORRIGIDO: Era currentScope, agora currentMonthData
        renderTable(currentMonthData.income, incomeTableBody, 'income');
        renderTable(currentMonthData.installments, installmentsTableBody, 'installments');
        renderSummary();
        renderChart();
        populateSelects(); // Assegura que os selects nos modais estejam atualizados
    };

    // --- Funções de Manipulação de Dados (Adicionar, Editar, Excluir) ---

    fixedExpenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('fixedExpenseId').value;
        const name = document.getElementById('fixedExpenseName').value;
        const date = document.getElementById('fixedExpenseDate').value;
        const paymentMethodId = document.getElementById('fixedExpensePaymentMethod').value;
        const categoryId = document.getElementById('fixedExpenseCategory').value;
        const value = parseFloat(document.getElementById('fixedExpenseValue').value);

        const currentMonthData = getCurrentMonthData();

        if (id) {
            const index = currentMonthData.fixedExpenses.findIndex(exp => exp.id === id);
            if (index !== -1) {
                currentMonthData.fixedExpenses[index] = { ...currentMonthData.fixedExpenses[index], name, date, paymentMethodId, categoryId, value };
            }
        } else {
            const newExpense = { id: generateId(), name, date, paymentMethodId, categoryId, value };
            currentMonthData.fixedExpenses.push(newExpense);
        }
        saveData();
        renderCurrentMonthData();
        closeModal(document.getElementById('fixedExpenseModal'));
    });

    monthlyExpenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('monthlyExpenseId').value;
        const name = document.getElementById('monthlyExpenseName').value;
        const date = document.getElementById('monthlyExpenseDate').value;
        const paymentMethodId = document.getElementById('monthlyExpensePaymentMethod').value;
        const categoryId = document.getElementById('monthlyExpenseCategory').value;
        const value = parseFloat(document.getElementById('monthlyExpenseValue').value);

        const currentMonthData = getCurrentMonthData();

        if (id) {
            const index = currentMonthData.monthlyExpenses.findIndex(exp => exp.id === id);
            if (index !== -1) {
                currentMonthData.monthlyExpenses[index] = { ...currentMonthData.monthlyExpenses[index], name, date, paymentMethodId, categoryId, value };
            }
        } else {
            const newExpense = { id: generateId(), name, date, paymentMethodId, categoryId, value };
            currentMonthData.monthlyExpenses.push(newExpense);
        }
        saveData();
        renderCurrentMonthData();
        closeModal(document.getElementById('monthlyExpenseModal'));
    });

    incomeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('incomeId').value;
        const name = document.getElementById('incomeName').value;
        const date = document.getElementById('incomeDate').value;
        const categoryId = document.getElementById('incomeCategory').value;
        const value = parseFloat(document.getElementById('incomeValue').value);

        const currentMonthData = getCurrentMonthData();

        if (id) {
            const index = currentMonthData.income.findIndex(inc => inc.id === id);
            if (index !== -1) {
                currentMonthData.income[index] = { ...currentMonthData.income[index], name, date, categoryId, value };
            }
        } else {
            const newIncome = { id: generateId(), name, date, categoryId, value };
            currentMonthData.income.push(newIncome);
        }
        saveData();
        renderCurrentMonthData();
        closeModal(document.getElementById('incomeModal'));
    });

    installmentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('installmentId').value;
        const name = document.getElementById('installmentName').value;
        const originalDate = document.getElementById('installmentDate').value; // Data da primeira parcela
        const totalInstallments = parseInt(document.getElementById('installmentTotal').value);
        const paymentMethodId = document.getElementById('installmentPaymentMethod').value;
        const categoryId = document.getElementById('installmentCategory').value;
        const valuePerInstallment = parseFloat(document.getElementById('installmentValue').value);

        const currentMonthData = getCurrentMonthData();

        if (id) {
            const index = currentMonthData.installments.findIndex(inst => inst.id === id);
            if (index !== -1) {
                currentMonthData.installments[index] = {
                    ...currentMonthData.installments[index],
                    name,
                    paymentMethodId,
                    categoryId,
                    valuePerInstallment
                };
            }
        } else {
            const newInstallment = {
                id: generateId(),
                name,
                originalDate,
                currentDate: originalDate,
                currentInstallment: 1,
                totalInstallments: totalInstallments,
                paymentMethodId,
                categoryId,
                valuePerInstallment,
                status: 'Ativa'
            };
            currentMonthData.installments.push(newInstallment);
        }
        saveData();
        renderCurrentMonthData();
        closeModal(document.getElementById('installmentModal'));
    });

    categoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('categoryId').value;
        const name = document.getElementById('categoryName').value;
        const color = document.getElementById('categoryColor').value;
        const type = document.getElementById('categoryType').value;
        const expectedExpense = type === 'expense' ? parseFloat(document.getElementById('categoryExpectedExpense').value) || 0 : 0;

        Object.values(allMonthsData).forEach(monthData => {
            if (id) {
                const index = monthData.categories.findIndex(cat => cat.id === id);
                if (index !== -1) {
                    monthData.categories[index] = { id, name, color, type, expectedExpense };
                }
            } else {
                const newCategory = { id: generateId(), name, color, type, expectedExpense };
                monthData.categories.push(newCategory);
            }
        });
        saveData();
        renderCurrentMonthData();
        renderCategoryList(); // Mantém a lista atualizada dentro do modal
        populateSelects(); // Atualiza selects dos modais
        // REMOVIDA A CHAMADA closeModal(document.getElementById('categoryModal'));
    });

    paymentMethodForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('paymentMethodId').value;
        const name = document.getElementById('paymentMethodName').value;
        const color = paymentMethodColorInput.value; // IMPORTANTE: Captura o valor da cor
        const isVoucher = name.toLowerCase().includes('vale') || name.toLowerCase().includes('ticket');
        const initialBalance = isVoucher ? parseFloat(document.getElementById('paymentMethodInitialBalance').value) || 0 : 0;

        Object.values(allMonthsData).forEach(monthData => {
            if (id) {
                const index = monthData.paymentMethods.findIndex(pm => pm.id === id);
                if (index !== -1) {
                    monthData.paymentMethods[index] = { id, name, color, isVoucher, initialBalance }; // IMPORTANTE: Salva a cor
                }
            } else {
                const newPaymentMethod = { id: generateId(), name, color, isVoucher, initialBalance }; // IMPORTANTE: Salva a cor
                monthData.paymentMethods.push(newPaymentMethod);
            }
        });
        saveData();
        renderCurrentMonthData();
        renderPaymentMethodList(); // Mantém a lista atualizada dentro do modal
        populateSelects(); // Atualiza selects dos modais
        // REMOVIDA A CHAMADA closeModal(document.getElementById('paymentMethodModal'));
    });

    categoryTypeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'expense') {
            expectedExpenseDiv.style.display = 'block';
        } else {
            expectedExpenseDiv.style.display = 'none';
            document.getElementById('categoryExpectedExpense').value = '';
        }
    });

    paymentMethodNameInput.addEventListener('input', (e) => {
        if (e.target.value.toLowerCase().includes('vale') || e.target.value.toLowerCase().includes('ticket')) {
            initialBalanceDiv.style.display = 'block';
        } else {
            initialBalanceDiv.style.display = 'none';
            document.getElementById('paymentMethodInitialBalance').value = '';
        }
    });

    // Global functions for edit/delete, accessible from inline HTML
    window.editItem = (id, type) => {
        let modalId;
        switch (type) {
            case 'fixedExpenses': modalId = 'fixedExpenseModal'; break;
            case 'monthlyExpenses': modalId = 'monthlyExpenseModal'; break;
            case 'income': modalId = 'incomeModal'; break;
            case 'installments': modalId = 'installmentModal'; break;
            case 'category': modalId = 'categoryModal'; break;
            case 'paymentMethod': modalId = 'paymentMethodModal'; break;
            default: return;
        }
        openModal(modalId, id, type);
    };

    window.deleteItem = (id, type) => {
        console.log(`Tentando excluir: ID=${id}, Tipo=${type}`); // Log para depuração
        showConfirmModal(`Tem certeza que deseja excluir este item de ${type}?`, (confirmed) => {
            if (confirmed) {
                console.log(`Confirmação recebida: SIM. Excluindo item ${id} do tipo ${type}.`); // Log para depuração
                let canDelete = true;
                if (type === 'category') {
                    const isCategoryInUse = Object.values(allMonthsData).some(monthData => {
                        return monthData.fixedExpenses.some(exp => exp.categoryId === id) ||
                               monthData.monthlyExpenses.some(exp => exp.categoryId === id) ||
                               monthData.income.some(inc => inc.categoryId === id) ||
                               monthData.installments.some(inst => inst.categoryId === id);
                    });
                    if (isCategoryInUse) {
                        alert('Não é possível excluir esta categoria porque ela está em uso.');
                        canDelete = false;
                    }
                } else if (type === 'paymentMethod') {
                    const isPaymentMethodInUse = Object.values(allMonthsData).some(monthData => {
                        return monthData.fixedExpenses.some(exp => exp.paymentMethodId === id) ||
                               monthData.monthlyExpenses.some(exp => exp.paymentMethodId === id) ||
                               monthData.installments.some(inst => inst.paymentMethodId === id);
                    });
                    if (isPaymentMethodInUse) {
                        alert('Não é possível excluir esta forma de pagamento porque ela está em uso.');
                        canDelete = false;
                    }
                }

                if (canDelete) {
                    if (type === 'category' || type === 'paymentMethod') {
                        Object.values(allMonthsData).forEach(monthData => {
                            monthData[type === 'category' ? 'categories' : 'paymentMethods'] = monthData[type === 'category' ? 'categories' : 'paymentMethods'].filter(item => item.id !== id);
                        });
                    } else if (type === 'installments') {
                        console.log(`Excluindo parcela mestre (ID: ${id}) de todos os meses.`);
                        const initialAllMonthsLength = Object.values(allMonthsData).reduce((total, month) => total + month.installments.length, 0);
                        console.log(`Before deletion: Total installments across all months = ${initialAllMonthsLength}`);

                        Object.values(allMonthsData).forEach(monthData => {
                            const originalMonthInstallmentsLength = monthData.installments.length;
                            monthData.installments = monthData.installments.filter(item => item.id !== id);
                            if (monthData.installments.length < originalMonthInstallmentsLength) {
                                console.log(`Removed installment ID ${id} from one month's data.`);
                            }
                        });
                        const finalAllMonthsLength = Object.values(allMonthsData).reduce((total, month) => total + month.installments.length, 0);
                        console.log(`After deletion: Total installments across all months = ${finalAllMonthsLength}`);
                        if (initialAllMonthsLength === finalAllMonthsLength) {
                            console.warn(`WARN: Installment ID ${id} was not found in any month or was already removed.`);
                        }
                    }
                    else {
                        const currentMonthData = getCurrentMonthData();
                        currentMonthData[type] = currentMonthData[type].filter(item => item.id !== id);
                    }
                    saveData();
                    renderCurrentMonthData();
                    if (type === 'category') renderCategoryList(); // Re-renderiza a lista no modal de categorias
                    if (type === 'paymentMethod') renderPaymentMethodList(); // Re-renderiza a lista no modal de formas de pagamento
                }
            } else {
                console.log("Confirmação recebida: NÃO. Exclusão cancelada.");
            }
        });
    };

    // --- Funções de Migração de Dados ---

    const migrateFixedExpenses = () => {
        const sortedMonths = Object.keys(allMonthsData).sort((a, b) => {
            const [yearA, monthA] = a.split('-').map(Number);
            const [yearB, monthB] = b.split('-').map(Number);
            if (yearA !== yearB) return yearA - yearB;
            return monthA - monthB;
        });

        for (let i = 0; i < sortedMonths.length - 1; i++) {
            const currentMonthKey = sortedMonths[i];
            const nextMonthKey = sortedMonths[i + 1];

            const currentMonthData = allMonthsData[currentMonthKey];
            const nextMonthData = allMonthsData[nextMonthKey];

            if (currentMonthData && nextMonthData) {
                currentMonthData.fixedExpenses.forEach(fixedExp => {
                    if (!nextMonthData.fixedExpenses.some(exp => exp.id === fixedExp.id)) {
                        nextMonthData.fixedExpenses.push({ ...fixedExp });
                    }
                });
            }
        }
    };

    const migrateInstallments = () => {
        const masterInstallmentDefinitions = new Map();

        // 1. Coleta e Padroniza as Definições Mestras de todas as parcelas
        Object.values(allMonthsData).forEach(monthData => {
            monthData.installments.forEach(inst => {
                const existingMaster = masterInstallmentDefinitions.get(inst.id);
                if (!existingMaster || new Date(inst.originalDate) < new Date(existingMaster.originalDate)) {
                    masterInstallmentDefinitions.set(inst.id, {
                        id: inst.id,
                        name: inst.name,
                        originalDate: inst.originalDate, // A data mais antiga para esta série
                        totalInstallments: inst.totalInstallments,
                        paymentMethodId: inst.paymentMethodId,
                        categoryId: inst.categoryId,
                        valuePerInstallment: inst.valuePerInstallment
                    });
                }
            });
        });

        // 2. Limpar todas as listas de parcelas em *todos* os meses antes de repopular.
        Object.keys(allMonthsData).forEach(monthKey => {
            allMonthsData[monthKey].installments = [];
        });

        // 3. Gerar e distribuir as parcelas para os meses corretos com base nas definições mestras.
        const sortedMonthsKeys = Object.keys(allMonthsData).sort((a, b) => {
            const [yearA, monthA] = a.split('-').map(Number);
            const [yearB, monthB] = b.split('-').map(Number);
            if (yearA !== yearB) return yearA - yearB;
            return monthA - monthB;
        });

        masterInstallmentDefinitions.forEach(masterInst => {
            const originalDate = new Date(masterInst.originalDate);

            sortedMonthsKeys.forEach(monthKey => {
                const monthDate = new Date(monthKey.split('-')[0], parseInt(monthKey.split('-')[1]) - 1, 1);

                const diffMonths = (monthDate.getFullYear() - originalDate.getFullYear()) * 12 +
                                   (monthDate.getMonth() - originalDate.getMonth());

                if (diffMonths < 0) {
                     return;
                }

                const currentInstallmentNumber = 1 + diffMonths;

                if (currentInstallmentNumber > masterInst.totalInstallments) {
                    return;
                }

                let newDay = originalDate.getDate();
                const daysInCurrentMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
                if (newDay > daysInCurrentMonth) {
                    newDay = daysInCurrentMonth;
                }
                const newDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), newDay);
                const newDateFormatted = newDate.toISOString().split('T')[0];

                const newInstallmentEntry = {
                    id: masterInst.id,
                    name: masterInst.name,
                    originalDate: masterInst.originalDate,
                    currentDate: newDateFormatted,
                    currentInstallment: currentInstallmentNumber,
                    totalInstallments: masterInst.totalInstallments,
                    paymentMethodId: masterInst.paymentMethodId,
                    categoryId: masterInst.categoryId,
                    valuePerInstallment: masterInst.valuePerInstallment,
                    status: 'Ativa'
                };

                allMonthsData[monthKey].installments.push(newInstallmentEntry);
            });
        });

        Object.keys(allMonthsData).forEach(monthKey => {
            allMonthsData[monthKey].installments.sort((a, b) => new Date(a.currentDate) - new Date(b.currentDate));
        });

        saveData();
    };


    // --- Gerenciamento de Abas ---

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');

            if (button.dataset.tab === 'chart') {
                renderChart();
            }
        });
    });

    // --- Exportar Dados ---
    exportDataBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify(allMonthsData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Dados exportados com sucesso!');
    });

    // --- Importar Dados ---
    importDataButton.addEventListener('click', () => {
        importDataInput.click();
    });

    importDataInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            alert('Nenhum arquivo selecionado.');
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                const hasValidStructure = Object.keys(importedData).every(monthKey => {
                    const monthData = importedData[monthKey];
                    return typeof monthData === 'object' &&
                           monthData.hasOwnProperty('fixedExpenses') &&
                           monthData.hasOwnProperty('monthlyExpenses') &&
                           monthData.hasOwnProperty('income') &&
                           monthData.hasOwnProperty('installments') &&
                           monthData.hasOwnProperty('categories') &&
                           monthData.hasOwnProperty('paymentMethods');
                });

                if (!hasValidStructure) {
                    alert('Erro: O arquivo JSON não parece ter a estrutura de dados esperada do seu controle financeiro.');
                    return;
                }

                showConfirmModal('Deseja **substituir** os dados existentes pelos dados importados ou **mesclá-los** (adicionar meses novos)?\n\n**"Sim" = Substituir (APAGA OS ATUAIS)**\n**"Não" = Mesclar (MANTÉM ATUAIS E ADICIONA NOVOS MESES)**', (shouldReplace) => {
                    if (shouldReplace) {
                        allMonthsData = importedData;
                        currentMonthKey = Object.keys(allMonthsData).sort()[0];
                        alert('Dados substituídos com sucesso!');
                    } else {
                        let newMonthsAdded = 0;
                        let monthsUpdated = 0;

                        for (const monthKey in importedData) {
                            if (allMonthsData.hasOwnProperty(monthKey)) {
                                allMonthsData[monthKey] = importedData[monthKey];
                                monthsUpdated++;
                            } else {
                                allMonthsData[monthKey] = importedData[monthKey];
                                newMonthsAdded++;
                            }
                        }
                        alert(`Dados mesclados com sucesso! ${newMonthsAdded} meses novos adicionados, ${monthsUpdated} meses atualizados.`);
                    }

                    saveData();
                    updateMonthSelect();
                    renderCurrentMonthData();
                });

            } catch (e) {
                alert('Erro ao ler o arquivo JSON. Certifique-se de que é um JSON válido: ' + e.message);
                console.error('Erro ao importar JSON:', e);
            }
        };

        reader.onerror = () => {
            alert('Erro ao ler o arquivo.');
        };

        reader.readAsText(file);
    });


    // --- Inicialização da Aplicação ---

    const initializeApp = () => {
        loadData();
        migrateFixedExpenses();
        migrateInstallments();
        updateMonthSelect();
        renderCurrentMonthData();

        document.querySelector('.tab-button[data-tab="summary"]').click();
    };

    initializeApp();
});
