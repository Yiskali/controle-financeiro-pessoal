document.addEventListener('DOMContentLoaded', () => {
    // --- Variáveis Globais e Inicialização ---
    let currentMonthKey; // FormatogetFullYear()-MM
    let allMonthsData = {}; // Objeto para armazenar dados de todos os meses

    // NOVO: A DEFINIÇÃO MESTRE GLOBAL PARA GASTOS FIXOS
    // Isso garante que haja uma única fonte de verdade para todos os gastos fixos recorrentes
    let masterFixedExpensesDefinitions = new Map(); // Map<id, {name, paymentMethodId, categoryId, value, date (original user input date)}>

    const monthSelect = document.getElementById('monthSelect');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const addMonthBtn = document.getElementById('addMonth'); // Botão que agora abre o modal de seleção de mês/ano
    const exportDataBtn = document.getElementById('exportData');
    const importDataInput = document.getElementById('importDataInput');
    const importDataButton = document.getElementById('importDataButton');
    const tabButtons = document.querySelectorAll('.tab-button'); // Única declaração para tabButtons
    const tabContents = document.querySelectorAll('.tab-content');

    // Resumo Cards
    const totalIncomeSummary = document.getElementById('totalIncomeSummary');
    const totalExpensesSummary = document.getElementById('totalExpensesSummary');
    const currentBalanceSummary = document.getElementById('currentBalanceSummary');
    // Renomeados
    const totalSpentRegularSummary = document.getElementById('totalSpentRegularSummary');
    const totalSpentVouchersSummary = document.getElementById('totalSpentVouchersSummary');
    // Novos Cards de Saldo
    const currentRegularBalanceSummary = document.getElementById('currentRegularBalanceSummary');
    const currentVoucherBalanceSummary = document.getElementById('currentVoucherBalanceSummary');

    const categorySummaryTableBody = document.querySelector('#categorySummaryTable tbody');
    const paymentMethodSummaryTableBody = document.querySelector('#paymentMethodSummaryTable tbody');

    // Tabelas (REFERÊNCIAS AGORA MAIS ROBUSTAS E VERIFICADAS NO HTML)
    const fixedExpensesTableBody = document.querySelector('#fixedExpensesTable tbody');
    const monthlyExpensesTableBody = document.querySelector('#monthlyExpensesTable tbody');
    const installmentsTableBody = document.querySelector('#installmentsTable tbody'); // Alterado para querySelector

    // Modais
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.modal .close-button');
    const addButtons = document.querySelectorAll('.add-button'); // Botões que abrem modais (para gastos fixos/mensais/parcelas)
    const actionGridButtons = document.querySelectorAll('.action-buttons-grid .action-grid-button'); // Botões da grade de Ações Rápidas

    // Forms
    const fixedExpenseForm = document.getElementById('fixedExpenseForm');
    const monthlyExpenseForm = document.getElementById('monthlyExpenseForm');
    const installmentForm = document.getElementById('installmentForm');
    const categoryForm = document.getElementById('categoryForm');
    const paymentMethodForm = document.getElementById('paymentMethodForm');

    // Novo Formulário e Botão para Salário Mensal
    const openIncomeModalButton = document.getElementById('openIncomeModalButton');
    const incomeInputModal = document.getElementById('incomeInputModal');
    const incomeInputForm = document.getElementById('incomeInputForm');
    const monthlySalaryValueInput = document.getElementById('monthlySalaryValue');

    // Elementos do NOVO Modal de Seleção de Mês/Ano
    const addMonthSelectionModal = document.getElementById('addMonthSelectionModal');
    const addMonthSelectionForm = document.getElementById('addMonthSelectionForm');
    const selectNewMonthYear = document.getElementById('selectNewMonthYear');
    const selectNewMonthMonth = document.getElementById('selectNewMonthMonth');

    // Elementos do NOVO Modal Customizado de Confirmação
    const customConfirmModal = document.getElementById('customConfirmModal');
    const customConfirmMessage = document.getElementById('customConfirmMessage');
    const customConfirmOption1Btn = document.getElementById('customConfirmOption1');
    const customConfirmOption2Btn = document.getElementById('customConfirmOption2');

    // Campos de seleção para categorias e formas de pagamento
    const fixedExpensePaymentMethodSelect = document.getElementById('fixedExpensePaymentMethod');
    const fixedExpenseCategorySelect = document.getElementById('fixedExpenseCategory');
    const monthlyExpensePaymentMethodSelect = document.getElementById('monthlyExpensePaymentMethod');
    const monthlyExpenseCategorySelect = document.getElementById('monthlyExpenseCategory');
    const incomeCategorySelect = document.getElementById('incomeCategory'); // Mantido para consistência, mas não usado diretamente para salário
    const installmentPaymentMethodSelect = document.getElementById('installmentPaymentMethod');
    const installmentCategorySelect = document.getElementById('installmentCategory');
    const categoryTypeSelect = document.getElementById('categoryType');
    const expectedExpenseDiv = document.getElementById('expectedExpenseDiv');
    const fixedExpenseDateInput = document.getElementById('fixedExpenseDate'); // Adicionado para facilitar o acesso
    const paymentMethodNameInput = document.getElementById('paymentMethodName');
    const initialBalanceDiv = document.getElementById('initialBalanceDiv');
    const paymentMethodColorInput = document.getElementById('paymentMethodColor');

    // Listas de gerenciamento
    const categoryList = document.getElementById('categoryList');
    const paymentMethodList = document.getElementById('paymentMethodList');

    // Confirm Modal (o original, para Sim/Não simples)
    const confirmModal = document.getElementById('confirmModal');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmYesBtn = document.getElementById('confirmYes');
    const confirmNoBtn = document.getElementById('confirmNo');
    let genericConfirmCallback = null; // Renomeado para evitar conflito

    // Botão para limpar dados transacionais
    const clearTransactionalDataButton = document.getElementById('clearTransactionalDataButton');

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

    // NOVA FUNÇÃO: Formata data de Букмекерлар-MM-DD para DD/MM/YYYY
    const formatDisplayDate = (dateString) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    // --- Funções de LocalStorage ---

    const loadData = () => {
        const data = localStorage.getItem('financialData');
        if (data) {
            allMonthsData = JSON.parse(data);
            // Garante que categorias e formas de pagamento tenham todas as propriedades esperadas, mesmo de dados antigos
            Object.values(allMonthsData).forEach(monthData => {
                // Assegura que income é sempre um array e tem um item 'salary'
                if (!monthData.income || !Array.isArray(monthData.income) || !monthData.income.some(item => item.id === 'salary')) {
                    // Se income não existe ou não tem salário, recria ou adiciona o salário padrão
                    const existingSalary = monthData.income && monthData.income.find(i => i.id === 'salary');
                    monthData.income = [{ id: 'salary', name: 'Salário Mensal', value: existingSalary ? existingSalary.value : 0 }];
                } else {
                    // Se já existe um array income, mas pode ter itens antigos que não são o salário único, filtra.
                    // Para garantir que income seja *apenas* o salário.
                    monthData.income = monthData.income.filter(item => item.id === 'salary');
                    if (monthData.income.length === 0) { // Se por algum motivo o filtro zerou (ex: id diferente)
                        monthData.income = [{ id: 'salary', name: 'Salário Mensal', value: 0 }];
                    }
                }

                // Garante que as outras propriedades da categoria/pm existam
                monthData.categories = monthData.categories.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    color: cat.color || '#cccccc',
                    type: cat.type,
                    expectedExpense: cat.expectedExpense || 0
                }));
                monthData.paymentMethods = monthData.paymentMethods.map(pm => ({
                    id: pm.id,
                    name: pm.name,
                    color: pm.color || '#cccccc',
                    isVoucher: (pm.name && (pm.name.toLowerCase().includes('vale') || pm.name.toLowerCase().includes('ticket'))) || false,
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
                // Entrada única de salário
                income: [{ id: 'salary', name: 'Salário Mensal', value: 0 }],
                installments: [],
                categories: [
                    { id: 'cat-1', name: 'Salário', color: '#8BC34A', type: 'income', expectedExpense: 0 },
                    { id: 'cat-2', name: 'Alimentação', color: '#FFEB3B', type: 'expense', expectedExpense: 500 },
                    { id: 'cat-3', name: 'Transporte', color: '#2196F3', type: 'expense', expectedExpense: 200 },
                    { id: 'cat-4', name: 'Moradia', color: '#FF9800', type: 'expense', expectedExpense: 800 }
                ],
                paymentMethods: [
                    { id: 'pm-1', name: 'Dinheiro', color: '#ADD8E6' },
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
                        fixedExpenses: [], monthlyExpenses: [], installments: [],
                        income: [{ id: 'salary', name: 'Salário Mensal', value: 0 }], // Garante o salário inicial
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
        const sortedMonths = Object.keys(allMonthsData).sort((a, b) => {
            const [yearA, monthA] = a.split('-').map(Number);
            const [yearB, monthB] = b.split('-').map(Number);
            if (yearA !== yearB) return yearA - yearB;
            return monthA - monthB;
        });

        const currentIndex = sortedMonths.indexOf(currentMonthKey);
        let newIndex;

        if (direction === 'prev') {
            newIndex = currentIndex - 1;
        } else { // 'next'
            newIndex = currentIndex + 1;
        }

        if (newIndex >= 0 && newIndex < sortedMonths.length) {
            currentMonthKey = sortedMonths[newIndex];
        } else {
            alert('Ops! Não há mais meses para navegar.');
            return;
        }

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

    // ATUALIZADO: addMonthBtn agora abre o modal de seleção de mês/ano
    addMonthBtn.addEventListener('click', () => {
        populateAddMonthSelects();
        openModal('addMonthSelectionModal');
    });

    // NOVO: Popula os seletores de ano e mês no modal de "Adicionar Novo Mês"
    const populateAddMonthSelects = () => {
        const currentYear = new Date().getFullYear();
        selectNewMonthYear.innerHTML = ''; // Limpa opções antigas

        // Popula anos: do ano atual - 5 até 2050
        for (let year = currentYear - 5; year <= 2050; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            selectNewMonthYear.appendChild(option);
        }
        // Seleciona o ano actual por padrão, a menos que o mês/ano actual do navegador seja mais avançado.
        selectNewMonthYear.value = new Date().getFullYear();

        // Seleciona o próximo mês após o mês atual no navegador (para o caso de adicionar mês futuro)
        const [currYear, currMonth] = currentMonthKey.split('-').map(Number);
        let nextMonthNum = currMonth + 1;
        let nextYearNum = currYear;
        if (nextMonthNum > 12) {
            nextMonthNum = 1;
            nextYearNum++;
        }
        selectNewMonthMonth.value = String(nextMonthNum).padStart(2, '0');
        selectNewMonthYear.value = nextYearNum;
    };

    // NOVO: Listener para o formulário de seleção de mês/ano
    addMonthSelectionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const selectedYear = selectNewMonthYear.value;
        const selectedMonth = selectNewMonthMonth.value;
        const newMonthKey = `${selectedYear}-${selectedMonth}`;

        if (allMonthsData[newMonthKey]) {
            alert('Ops! Esse mês já existe.');
            return; // Impede a criação se o mês já existe
        }

        // Usando o showConfirmModal customizado
        showConfirmModal('Deseja copiar dados (exceto parcelas, que migram automaticamente) do mês atual para o novo mês?', 
                         (response) => {
            const confirmCopy = (response === 'local'); // 'local' para sim, 'global' para não (inverte lógica)
            const currentMonthData = getCurrentMonthData();

            allMonthsData[newMonthKey] = {
                fixedExpenses: confirmCopy && currentMonthData ? JSON.parse(JSON.stringify(currentMonthData.fixedExpenses.map(exp => ({ ...exp })))) : [],
                monthlyExpenses: confirmCopy && currentMonthData ? JSON.parse(JSON.stringify(currentMonthData.monthlyExpenses.map(exp => ({ ...exp })))) : [],
                income: [{ id: 'salary', name: 'Salário Mensal', value: (currentMonthData && currentMonthData.income.find(i => i.id === 'salary')?.value) || 0 }], // Garante o salário inicial copiado
                installments: [], // Parcelas não são copiadas diretamente aqui, elas migram
                categories: currentMonthData ? JSON.parse(JSON.stringify(currentMonthData.categories)) : [],
                paymentMethods: currentMonthData ? JSON.parse(JSON.stringify(currentMonthData.paymentMethods)) : []
            };

            currentMonthKey = newMonthKey; // Define o novo mês como o atual
            saveData();
            updateMonthSelect();
            renderCurrentMonthData();
            closeModal(addMonthSelectionModal); // Fecha o modal de seleção
            alert(`Mês ${new Date(selectedYear, parseInt(selectedMonth) - 1).toLocaleString('pt-BR', { month: 'long' })} / ${selectedYear} adicionado com sucesso!`);
        },
        'Sim', 'Não'); // Labels Sim/Não para este modal específico
    });

    // --- Funções de Modais ---

    const openModal = (modalId, itemId = null, itemType = null) => {
        const modal = document.getElementById(modalId);
        modal.style.display = 'flex';
        resetForm(modalId); // Reseta o formulário e suas listas internas

        // Popula os selects para garantir que as opções estejam disponíveis antes de tentar definir o valor.
        populateSelects(); 

        if (itemId && itemType) {
            const currentMonthData = getCurrentMonthData();
            let item;
            switch (itemType) {
                case 'fixedExpenses':
                    item = currentMonthData.fixedExpenses.find(exp => exp.id === itemId);
                    if (item) {
                        document.getElementById('fixedExpenseId').value = item.id;
                        document.getElementById('fixedExpenseName').value = item.name;
                        fixedExpenseDateInput.value = item.date; // Preencher com a data existente
                        document.getElementById('fixedExpensePaymentMethod').value = item.paymentMethodId;
                        document.getElementById('fixedExpenseCategory').value = item.categoryId;
                        document.getElementById('fixedExpenseValue').value = item.value;

                        // Selecionar valores corretos nos dropdowns
                        fixedExpensePaymentMethodSelect.value = item.paymentMethodId;
                        fixedExpenseCategorySelect.value = item.categoryId;
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

                        // Selecionar valores corretos nos dropdowns
                        monthlyExpensePaymentMethodSelect.value = item.paymentMethodId;
                        monthlyExpenseCategorySelect.value = item.categoryId;
                    }
                    break;
                case 'installments':
                    item = currentMonthData.installments.find(inst => inst.id === itemId);
                    if (item) { // EDITANDO parcela existente
                        document.getElementById('installmentId').value = item.id;
                        document.getElementById('installmentName').value = item.name;
                        document.getElementById('installmentDate').value = item.purchaseDate; // IMPORTANTE: Preencher com purchaseDate (data da compra)
                        document.getElementById('installmentTotal').value = item.totalInstallments;
                        document.getElementById('installmentPaymentMethod').value = item.paymentMethodId;
                        document.getElementById('installmentCategory').value = item.categoryId;
                        document.getElementById('installmentValue').value = item.valuePerInstallment; // Valor por parcela

                        // Selecionar valores corretos nos dropdowns
                        installmentPaymentMethodSelect.value = item.paymentMethodId;
                        installmentCategorySelect.value = item.categoryId;
                    }
                    break;
                case 'category':
                    item = currentMonthData.categories.find(cat => cat.id === itemId);
                    if (item) {
                        document.getElementById('categoryId').value = item.id;
                        document.getElementById('categoryName').value = item.name;
                        document.getElementById('categoryColor').value = item.color || '#cccccc';
                        document.getElementById('categoryType').value = item.type;
                        // Ao editar, mostramos a expectativa se o tipo for despesa
                        if (item.type === 'expense') {
                            expectedExpenseDiv.style.display = 'block';
                            document.getElementById('categoryExpectedExpense').value = item.expectedExpense || '';
                        } else {
                            expectedExpenseDiv.style.display = 'none';
                            document.getElementById('categoryExpectedExpense').value = ''; // Limpa se for receita
                        }
                    }
                    break;
                case 'paymentMethod':
                    item = currentMonthData.paymentMethods.find(pm => pm.id === itemId);
                    if (item) { // Se estamos EDITANDO um item existente
                        document.getElementById('paymentMethodId').value = item.id;
                        document.getElementById('paymentMethodName').value = item.name;
                        paymentMethodColorInput.value = item.color || '#cccccc'; // Preencher campo de cor com 'item.color'
                        
                        // Determinar visibilidade do saldo com base no nome do item existente
                        if (item.name.toLowerCase().includes('vale') || item.name.toLowerCase().includes('ticket')) {
                            initialBalanceDiv.style.display = 'block';
                            document.getElementById('paymentMethodInitialBalance').value = item.initialBalance || '';
                        } else {
                            initialBalanceDiv.style.display = 'none';
                            document.getElementById('paymentMethodInitialBalance').value = '';
                        }
                    } else { // Se estamos ADICIONANDO um NOVO item (itemId é null ou item não encontrado)
                        // Para um novo item, o campo de saldo inicial deve estar escondido por padrão.
                        // Ele só aparecerá dinamicamente quando o usuário digitar 'vale' no campo de nome (tratado pelo input.addEventListener).
                        document.getElementById('paymentMethodId').value = ''; // Garante que o ID esteja limpo para nova adição
                        document.getElementById('paymentMethodName').value = ''; // Limpa o nome
                        paymentMethodColorInput.value = '#cccccc'; // Define cor padrão para novo item
                        initialBalanceDiv.style.display = 'none'; // Esconde o campo de saldo
                        document.getElementById('paymentMethodInitialBalance').value = ''; // Limpa o valor do saldo
                    }
                    break;
                // NOVO: Case para o modal de entrada de salário
                case 'incomeInput':
                    const salaryItem = currentMonthData.income.find(i => i.id === 'salary');
                    monthlySalaryValueInput.value = salaryItem ? salaryItem.value : 0;
                    break;
            }
        } else if (modalId === 'paymentMethodModal') { // Se o modal é de paymentMethod e não estamos editando (ou seja, novo)
             // Assegurar que o campo de saldo está escondido para novas formas de pagamento ao abrir o modal
             initialBalanceDiv.style.display = 'none';
             document.getElementById('paymentMethodInitialBalance').value = '';
        } else if (modalId === 'incomeInputModal') { // Se o modal é de entrada de salário e não estamos editando (sempre será um novo valor para este mês)
            const salaryItem = currentMonthData.income.find(i => i.id === 'salary');
            monthlySalaryValueInput.value = salaryItem ? salaryItem.value : 0;
        } else if (modalId === 'addMonthSelectionModal') { // Para o modal de seleção de mês/ano
            populateAddMonthSelects(); // Popula os seletores de ano e mês
        }

        // IMPORTANTE: Dispara o evento change no categoryTypeSelect para que a visibilidade da expectativa seja atualizada
        // Isso garante que a div de expectativa apareça/desapareça corretamente ao abrir o modal
        const event = new Event('change');
        categoryTypeSelect.dispatchEvent(event);
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
                document.getElementById('categoryExpectedExpense').value = ''; // Limpa o valor

                // IMPORTANTE: Dispara o evento change no categoryTypeSelect após o reset
                // Isso garante que a visibilidade da expectativa seja definida pelo valor padrão ('expense')
                const event = new Event('change');
                categoryTypeSelect.dispatchEvent(event);
            }
            if (modalId === 'paymentMethodModal') {
                renderPaymentMethodList(); // Re-renderiza a lista de formas de pagamento no modal
                // IMPORTANTE: Resetar também o campo de cor e esconder o saldo ao resetar
                paymentMethodColorInput.value = '#cccccc'; // Reseta a cor para o padrão
                initialBalanceDiv.style.display = 'none'; // Esconde o saldo ao resetar
                document.getElementById('paymentMethodInitialBalance').value = ''; // Limpa o valor
            }
            if (modalId === 'incomeInputModal') { // NOVO: Reset para o modal de salário
                monthlySalaryValueInput.value = 0;
            }
            if (modalId === 'addMonthSelectionModal') { // NOVO: Reset para o modal de seleção de mês/ano
                // Não precisa de reset específico aqui, populateAddMonthSelects cuidará
            }
        }
    };

    // Event listeners para abrir modais
    // Botões que abrem modais genéricos (como add gasto fixo, add gasto mensal, add parcela)
    addButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const modalId = e.target.dataset.modal;
            openModal(modalId);
        });
    });

    // Listener para o novo botão 'Inserir Salário'
    openIncomeModalButton.addEventListener('click', () => {
        openModal('incomeInputModal', null, 'incomeInput'); // Abre o modal de salário
    });

    // Listener para os botões da grade de Ações Rápidas (Gerenciar Categorias, Gerenciar Formas de Pagamento, Exportar, Importar, Limpar)
    actionGridButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const modalId = e.target.closest('.action-grid-button').dataset.modal; // Pega o data-modal do botão clicado
            const buttonId = e.target.closest('.action-grid-button').id; // Pega o ID do botão clicado

            // Trata casos especiais que não abrem modais via data-modal diretamente
            if (buttonId === 'exportData') {
                document.getElementById('exportData').click();
            } else if (buttonId === 'importDataButton') {
                document.getElementById('importDataInput').click(); // Clica no input de arquivo oculto
            } else if (buttonId === 'clearTransactionalDataButton') {
                document.getElementById('clearTransactionalDataButton').click();
            } else if (buttonId === 'openIncomeModalButton') { // Para o botão Inserir Salário, que agora faz parte da grade
                openModal('incomeInputModal', null, 'incomeInput');
            }
            else if (modalId) {
                // Para botões que abrem modais (Gerenciar Categorias, Gerenciar Formas de Pagamento)
                openModal(modalId);
            }
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

    // Função de confirmação genérica (agora com suporte a Sim/Não E opções customizadas)
    // O callback para customizada retornará 'local' ou 'global'
    // O callback para Sim/Não retornará true ou false
    let currentCustomConfirmCallback = null; // Para armazenar o callback da confirmação customizada

    const showConfirmModal = (message, callback, option1Text = 'Sim', option2Text = 'Não') => {
        // Define o callback para o handler principal
        currentCustomConfirmCallback = callback;

        // Verifica se é uma confirmação com opções customizadas (usando labels de botões diferentes de Sim/Não)
        if (option1Text !== 'Sim' || option2Text !== 'Não') {
            // Esconde o modal Sim/Não padrão se estiver visível
            confirmModal.style.display = 'none';

            customConfirmModal.style.display = 'flex';
            customConfirmMessage.textContent = message; // Exibe a mensagem completa
            customConfirmOption1Btn.textContent = option1Text;
            customConfirmOption2Btn.textContent = option2Text;

            // Remove listeners antigos para evitar duplicação em cliques repetidos no mesmo modal
            customConfirmOption1Btn.removeEventListener('click', handleCustomConfirmButtonClick);
            customConfirmOption2Btn.removeEventListener('click', handleCustomConfirmButtonClick);

            // Adiciona novos listeners
            customConfirmOption1Btn.addEventListener('click', handleCustomConfirmButtonClick);
            customConfirmOption2Btn.addEventListener('click', handleCustomConfirmButtonClick);

        } else {
            // Para confirmações Sim/Não genéricas (o modal original 'confirmModal')
            // Esconde o modal customizado se estiver visível
            customConfirmModal.style.display = 'none';

            confirmModal.style.display = 'flex';
            confirmMessage.textContent = message;

            // Remove listeners antigos para evitar duplicação
            confirmYesBtn.removeEventListener('click', handleGenericConfirmButtonClick);
            confirmNoBtn.removeEventListener('click', handleGenericConfirmButtonClick);

            confirmYesBtn.addEventListener('click', handleGenericConfirmButtonClick);
            confirmNoBtn.addEventListener('click', handleGenericConfirmButtonClick);
        }
    };

    // Handler genérico para os botões do modal customizado (fora de showConfirmModal)
    const handleCustomConfirmButtonClick = (e) => {
        const choice = e.target.id === 'customConfirmOption1' ? 'local' : 'global'; // 'local' para opção 1, 'global' para opção 2
        if (currentCustomConfirmCallback) {
            currentCustomConfirmCallback(choice);
        }
        customConfirmModal.style.display = 'none';
        currentCustomConfirmCallback = null; // Limpa o callback após uso
    };

    // Handler genérico para os botões do modal Sim/Não (fora de showConfirmModal)
    const handleGenericConfirmButtonClick = (e) => {
        const choice = e.target.id === 'confirmYes' ? true : false;
        if (currentCustomConfirmCallback) {
            currentCustomConfirmCallback(choice);
        }
        confirmModal.style.display = 'none';
        currentCustomConfirmCallback = null; // Limpa o callback após uso
    };


    // --- NOVO: Função para limpar dados transacionais seletivamente ---
    clearTransactionalDataButton.addEventListener('click', () => {
        showConfirmModal('Tem certeza que deseja apagar TODOS os gastos, entradas e parcelas de TODOS os meses? Categorias e Formas de Pagamento serão mantidas.', (confirmed) => {
            if (confirmed) {
                console.log("Confirmado: Limpando dados transacionais de todos os meses.");
                Object.keys(allMonthsData).forEach(monthKey => {
                    allMonthsData[monthKey].fixedExpenses = [];
                    allMonthsData[monthKey].monthlyExpenses = [];
                    // Mantém o salário mensal, apenas zera o valor
                    let salaryItem = allMonthsData[monthKey].income.find(i => i.id === 'salary');
                    if (salaryItem) {
                        salaryItem.value = 0;
                    } else {
                        allMonthsData[monthKey].income.push({ id: 'salary', name: 'Salário Mensal', value: 0 });
                    }
                    allMonthsData[monthKey].installments = [];
                });
                saveData();
                renderCurrentMonthData();
                alert('Dados transacionais limpos com sucesso! Categorias e Formas de Pagamento foram mantidas.');
            } else {
                console.log("Cancelado: Limpeza de dados transacionais.");
            }
        });
    });

    // --- NOVO: Lógica para Salvar o Salário Mensal ---
    incomeInputForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const salaryValue = parseFloat(monthlySalaryValueInput.value);
        
        if (isNaN(salaryValue) || salaryValue < 0) {
            alert("Por favor, insira um valor de salário válido e não negativo.");
            return;
        }

        const currentMonthData = getCurrentMonthData();
        let salaryItem = currentMonthData.income.find(i => i.id === 'salary');

        if (salaryItem) {
            salaryItem.value = salaryValue;
        } else {
            // Isso não deve acontecer se loadData() inicializar corretamente, mas é uma segurança
            currentMonthData.income.push({ id: 'salary', name: 'Salário Mensal', value: salaryValue });
        }
        
        saveData();
        renderCurrentMonthData();
        closeModal(incomeInputModal);
        alert('Salário mensal salvo com sucesso!');
    });


    // --- Funções de Renderização de Dados ---

    const renderSummary = () => {
        const currentMonthData = getCurrentMonthData();
        if (!currentMonthData) return;

        // Total de Entradas: Agora vem do salário mensal
        const monthlySalary = currentMonthData.income.find(item => item.id === 'salary')?.value || 0;
        let totalIncome = monthlySalary; // O total de entradas é apenas o salário mensal

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

        // --- CÁLCULOS DOS NOVOS CARDS ---
        let totalSpentRegular = 0;
        let totalSpentVouchers = 0;
        let totalInitialVoucherBalance = 0; // Soma dos saldos iniciais de todas as formas de pagamento 'vale'
        let totalInitialRegularIncome = totalIncome; // Saldo inicial regular é o total de entradas (salário)

        // Coleta o saldo inicial de todas as formas de pagamento que são vales
        const paymentMethods = getCurrentMonthData().paymentMethods;
        paymentMethods.forEach(pm => {
            if (pm.isVoucher) {
                totalInitialVoucherBalance += pm.initialBalance || 0;
            }
        });

        const allExpenses = [
            ...currentMonthData.fixedExpenses,
            ...currentMonthData.monthlyExpenses,
            ...currentMonthData.installments.filter(inst => inst.status === 'Ativa')
        ];

        allExpenses.forEach(exp => {
            const paymentMethod = paymentMethods.find(pm => pm.id === exp.paymentMethodId);
            if (paymentMethod && paymentMethod.isVoucher) {
                totalSpentVouchers += exp.value || exp.valuePerInstallment;
            } else {
                totalSpentRegular += exp.value || exp.valuePerInstallment;
            }
        });

        // Cálculos dos Saldos
        let currentVoucherBalance = totalInitialVoucherBalance - totalSpentVouchers;
        let currentRegularBalance = totalInitialRegularIncome - totalSpentRegular; // Saldo Regular = Entradas (salário) - Gastos Regulares

        // ATUALIZAÇÃO DOS CARDS
        totalSpentRegularSummary.textContent = formatCurrency(totalSpentRegular);
        currentRegularBalanceSummary.textContent = formatCurrency(currentRegularBalance);
        currentRegularBalanceSummary.className = currentRegularBalance >= 0 ? 'balance-positive' : 'balance-negative';

        totalSpentVouchersSummary.textContent = formatCurrency(totalSpentVouchers);
        currentVoucherBalanceSummary.textContent = formatCurrency(currentVoucherBalance);
        currentVoucherBalanceSummary.className = currentVoucherBalance >= 0 ? 'balance-positive' : 'balance-negative';

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
                        <td>${formatDisplayDate(item.date)}</td> <!-- Formata a data para exibição -->
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
                case 'installments':
                    row.innerHTML = `
                        <td>${item.name}</td>
                        <td>${formatDisplayDate(item.purchaseDate)}</td> <!-- Exibir a purchaseDate -->
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
                if (type === 'income' && item.type !== 'income') return; // Para income, só categorias de receita
                if (['fixedExpenses', 'monthlyExpenses', 'installments'].includes(type) && item.type !== 'expense') return; // Para despesas, só categorias de despesa

                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.name;
                selectElement.appendChild(option);
            });
        };

        populateSelect(fixedExpensePaymentMethodSelect, paymentMethods, 'paymentMethod');
        populateSelect(fixedExpenseCategorySelect, categories, 'fixedExpenses'); // Passando o tipo de array de despesa
        populateSelect(monthlyExpensePaymentMethodSelect, paymentMethods, 'paymentMethod');
        populateSelect(monthlyExpenseCategorySelect, categories, 'monthlyExpenses'); // Passando o tipo de array de despesa
        populateSelect(installmentPaymentMethodSelect, paymentMethods, 'paymentMethod');
        populateSelect(installmentCategorySelect, categories, 'installments'); // Passando o tipo de array de despesa
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
                    fixedExpenses: [], monthlyExpenses: [], installments: [],
                    income: [{ id: 'salary', name: 'Salário Mensal', value: 0 }], // Garante o salário inicial
                    categories: [], paymentMethods: []
                };
            }
            saveData();
            updateMonthSelect();
            renderCurrentMonthData(); // Chama novamente para renderizar o mês inicializado
            return;
        }

        // NOVO: Migra gastos fixos ANTES de renderizar
        migrateFixedExpenses();
        // Migra parcelas ANTES de renderizar
        migrateInstallments();

        const currentMonthData = getCurrentMonthData();
        // Acesso mais seguro aos tbody
        const fixedTbody = document.querySelector('#fixedExpensesTable tbody');
        const monthlyTbody = document.querySelector('#monthlyExpensesTable tbody');
        const installmentsTbody = document.querySelector('#installmentsTable tbody');

        if (fixedTbody) renderTable(currentMonthData.fixedExpenses, fixedTbody, 'fixedExpenses');
        if (monthlyTbody) renderTable(currentMonthData.monthlyExpenses, monthlyTbody, 'monthlyExpenses');
        if (installmentsTbody) renderTable(currentMonthData.installments, installmentsTbody, 'installments');

        renderSummary();
        renderChart(); // O gráfico é renderizado quando a aba é selecionada
        populateSelects(); // Assegura que os selects nos modais estejam atualizados
    };

    // --- Funções de Manipulação de Dados (Adicionar, Editar, Excluir) ---

document.addEventListener('DOMContentLoaded', () => {
    
fixedExpenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Obter valores do formulário
    const id = document.getElementById('fixedExpenseId').value;
    const name = document.getElementById('fixedExpenseName').value.trim();
    const dateInput = document.getElementById('fixedExpenseDate').value;
    const paymentMethodId = document.getElementById('fixedExpensePaymentMethod').value;
    const categoryId = document.getElementById('fixedExpenseCategory').value;
    const value = parseFloat(document.getElementById('fixedExpenseValue').value);

    // Validar campos obrigatórios
    if (!name || !dateInput || !paymentMethodId || !categoryId || isNaN(value) || value <= 0) {
        alert('Por favor, preencha todos os campos corretamente!');
        return;
    }

    // Processar data
    const [currentYear, currentMonth] = currentMonthKey.split('-').map(Number);
    const dayFromInput = new Date(dateInput).getDate();
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
    const effectiveDay = Math.min(dayFromInput, lastDayOfMonth);
    const finalDate = new Date(currentYear, currentMonth - 1, effectiveDay).toISOString().split('T')[0];

    const currentMonthData = getCurrentMonthData();

    if (id) {
        // Edição existente
        showConfirmModal('Alterar gasto fixo em:', (response) => {
            if (response) { // "No mês selecionado"
                // Atualiza apenas no mês atual
                const index = currentMonthData.fixedExpenses.findIndex(exp => exp.id === id);
                if (index !== -1) {
                    currentMonthData.fixedExpenses[index] = {
                        id,
                        name,
                        date: finalDate,
                        paymentMethodId,
                        categoryId,
                        value
                    };
                } else {
                    currentMonthData.fixedExpenses.push({
                        id,
                        name,
                        date: finalDate,
                        paymentMethodId,
                        categoryId,
                        value
                    });
                }
                
                saveData();
                renderCurrentMonthData();
                closeModal(document.getElementById('fixedExpenseModal'));
                alert('Gasto fixo atualizado no mês atual!');
            } else { // "Todos os meses"
                // Remove de todos os meses
                Object.keys(allMonthsData).forEach(monthKey => {
                    allMonthsData[monthKey].fixedExpenses = allMonthsData[monthKey].fixedExpenses.filter(exp => exp.id !== id);
                });

                // Atualiza definição mestre
                masterFixedExpensesDefinitions.set(id, {
                    id,
                    name,
                    date: dateInput, // Mantém a data original para propagação
                    paymentMethodId,
                    categoryId,
                    value
                });

                saveData();
                renderCurrentMonthData();
                closeModal(document.getElementById('fixedExpenseModal'));
                alert('Gasto fixo atualizado em todos os meses!');
            }
        }, 'No mês selecionado', 'Todos os meses');
    } else {
        // Novo gasto fixo
        const newId = generateId();
        currentMonthData.fixedExpenses.push({
            id: newId,
            name,
            date: finalDate,
            paymentMethodId,
            categoryId,
            value
        });

        // Adiciona à definição mestre
        masterFixedExpensesDefinitions.set(newId, {
            id: newId,
            name,
            date: dateInput, // Data original para propagação
            paymentMethodId,
            categoryId,
            value
        });

        saveData();
        renderCurrentMonthData();
        closeModal(document.getElementById('fixedExpenseModal'));
        alert('Novo gasto fixo adicionado com sucesso!');
    }
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

    installmentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('installmentId').value;
        const name = document.getElementById('installmentName').value;
        const purchaseDateFromInput = document.getElementById('installmentDate').value; // Data que o usuário digitou (ex: '2025-01-12')
        const totalInstallments = parseInt(document.getElementById('installmentTotal').value); // Nova quantidade de parcelas
        const paymentMethodId = document.getElementById('installmentPaymentMethod').value;
        const categoryId = document.getElementById('installmentCategory').value;
        const valuePerInstallment = parseFloat(document.getElementById('installmentValue').value);

        const currentMonthData = getCurrentMonthData();
        const [currentYearSelected, currentMonthSelected] = currentMonthKey.split('-').map(Number); // Ano e mês do mês ATUALMENTE SELECIONADO NO MENU

        // Extrai APENAS O DIA da data de compra digitada pelo usuário
        const purchaseDay = new Date(purchaseDateFromInput + 'T12:00:00').getDate(); // Adiciona hora para evitar problemas de fuso horário
        
        // Constrói a seriesStartDate (que será a "originalDate" para a série de parcelas)
        // usando o ANO e MÊS DO MÊS ATUALMENTE SELECIONADO no menu, e o DIA DA COMPRA.
        // O Math.min garante que o dia não exceda o último dia do mês (ex: 31 de fevereiro)
        const lastDayOfSelectedMonth = new Date(currentYearSelected, currentMonthSelected, 0).getDate();
        const effectiveDayForSeries = Math.min(purchaseDay, lastDayOfSelectedMonth);

        const seriesStartDate = new Date(currentYearSelected, currentMonthSelected - 1, effectiveDayForSeries);
        const formattedSeriesStartDate = seriesStartDate.toISOString().split('T')[0];

        if (id) {
            // Edição de parcela existente:
            // A purchaseDate (data da compra visual) e totalInstallments (total de parcelas) podem ser editados.
            // A originalDate (seriesStartDate) da série mestre será atualizada para refletir a nova data de início da série se for alterada,
            // e migrateInstallments() recriará a série.
            
            showConfirmModal('Alterar dados de Compra Parcelada em :\nOpção 1 - Somente neste mês (não recomendado)\nOpção 2: Todos os meses (altera a série de parcelas)', 
                             (response) => {
                if (response === 'local') { // Opção 1: Somente neste mês (NÃO recomendado para parcelas globais)
                    const index = currentMonthData.installments.findIndex(inst => inst.id === id);
                    if (index !== -1) {
                        currentMonthData.installments[index] = {
                            ...currentMonthData.installments[index],
                            name: name,
                            purchaseDate: purchaseDateFromInput, // Atualiza a data de compra visualmente
                            totalInstallments: totalInstallments, // AGORA ATUALIZA O TOTAL DE PARCELAS TAMBÉM
                            paymentMethodId: paymentMethodId,
                            categoryId: categoryId,
                            valuePerInstallment: valuePerInstallment
                            // originalDate (seriesStartDate) e currentDate não são alterados em edição
                            // pois são recalculados pela migrateInstallments
                        };
                    }
                    saveData();
                    renderCurrentMonthData();
                    alert('Atenção: A parcela foi alterada apenas neste mês. A série completa pode não estar consistente. Considere a opção "Todos os meses" para alterações futuras.');
                } else if (response === 'global') { // Opção 2: Todos os meses (RECOMENDADO para parcelas)
                    // Encontra a definição mestre da parcela para atualizar todos os meses
                    // Itera por *todos* os meses para encontrar e atualizar o item com o ID correspondente
                    Object.keys(allMonthsData).forEach(monthKey => {
                        let monthData = allMonthsData[monthKey];
                        const index = monthData.installments.findIndex(inst => inst.id === id);
                        if (index !== -1) {
                            // Atualiza os campos globais da série de parcelas
                            monthData.installments[index] = {
                                ...monthData.installments[index],
                                name: name,
                                purchaseDate: purchaseDateFromInput, // Atualiza a data de compra
                                originalDate: formattedSeriesStartDate, // Atualiza a data de início da série
                                totalInstallments: totalInstallments, // ATUALIZA O TOTAL DE PARCELAS
                                paymentMethodId: paymentMethodId,
                                categoryId: categoryId,
                                valuePerInstallment: valuePerInstallment
                            };
                        }
                    });
                    saveData();
                    renderCurrentMonthData(); // Disparará migrateInstallments() que recriará a série
                    alert('Compra parcelada atualizada em todos os meses subsequentes.');
                }
            }, 
            'No mês selecionado', 'Todos os meses'); // Labels para os botões do modal customizado
        } else {
            // Adicionando uma NOVA compra parcelada
            const newInstallment = {
                id: generateId(),
                name,
                purchaseDate: purchaseDateFromInput, // SALVA A DATA DIGITADA PELO USUÁRIO (ex: 2025-01-12) - para registro
                originalDate: formattedSeriesStartDate, // seriesStartDate: Data de início da série (mês atual no menu + dia da compra)
                currentDate: formattedSeriesStartDate, // A primeira parcela deste mês
                currentInstallment: 1, // Sempre a primeira parcela da série ao adicionar
                totalInstallments: totalInstallments,
                paymentMethodId: paymentMethodId,
                categoryId: categoryId,
                valuePerInstallment: valuePerInstallment,
                status: 'Ativa'
            };
            currentMonthData.installments.push(newInstallment);
        }
        saveData();
        renderCurrentMonthData();
        // NÃO FECHA O MODAL: apenas o reseta para uma nova entrada
        resetForm('installmentModal');
    });

    categoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('categoryId').value;
        const name = document.getElementById('categoryName').value;
        const color = document.getElementById('categoryColor').value;
        const type = document.getElementById('categoryType').value;
        const expectedExpense = type === 'expense' ? parseFloat(document.getElementById('categoryExpectedExpense').value) || 0 : 0;

        // Crie a nova categoria ou a versão atualizada
        let categoryToSave = { id: id || generateId(), name, color, type, expectedExpense };

        // Agora, propague esta categoria (nova ou atualizada) para TODOS os meses
        Object.keys(allMonthsData).forEach(monthKey => {
            let monthData = allMonthsData[monthKey];
            const index = monthData.categories.findIndex(cat => cat.id === categoryToSave.id);
            if (index !== -1) {
                // Se a categoria já existe neste mês, atualize-a
                monthData.categories[index] = categoryToSave;
            } else {
                // Se a categoria é nova, adicione-a a este mês
                monthData.categories.push(categoryToSave);
            }
        });
        // IMPORTANTE: Remove duplicatas que podem ter sido criadas antes desta correção
        Object.keys(allMonthsData).forEach(monthKey => {
            let monthData = allMonthsData[monthKey];
            const seenIds = new Set();
            monthData.categories = monthData.categories.filter(cat => {
                const duplicate = seenIds.has(cat.id);
                seenIds.add(cat.id);
                return !duplicate;
            });
        });

        saveData();
        renderCurrentMonthData();
        renderCategoryList(); // Mantém a lista atualizada dentro do modal
        populateSelects(); // Atualiza selects dos modais
        // Resetar o formulário de categoria para permitir nova adição
        resetForm('categoryModal');
    });

    paymentMethodForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('paymentMethodId').value;
        const name = document.getElementById('paymentMethodName').value;
        const color = paymentMethodColorInput.value; // Capturar a cor
        const isVoucher = name.toLowerCase().includes('vale') || name.toLowerCase().includes('ticket');
        const initialBalance = isVoucher ? parseFloat(document.getElementById('paymentMethodInitialBalance').value) || 0 : 0;

        // Crie a nova forma de pagamento ou a versão atualizada
        let paymentMethodToSave = { id: id || generateId(), name, color, isVoucher, initialBalance };

        // Agora, propague esta forma de pagamento (nova ou atualizada) para TODOS os meses
        Object.keys(allMonthsData).forEach(monthKey => {
            let monthData = allMonthsData[monthKey];
            const index = monthData.paymentMethods.findIndex(pm => pm.id === paymentMethodToSave.id);
            if (index !== -1) {
                // Se a forma de pagamento já existe neste mês, atualize-a
                monthData.paymentMethods[index] = paymentMethodToSave;
            } else {
                // Se a forma de pagamento é nova, adicione-a a este mês
                monthData.paymentMethods.push(paymentMethodToSave);
            }
        });
        // IMPORTANTE: Remove duplicatas que podem ter sido criadas antes desta correção
        Object.keys(allMonthsData).forEach(monthKey => {
            let monthData = allMonthsData[monthKey];
            const seenIds = new Set();
            monthData.paymentMethods = monthData.paymentMethods.filter(pm => {
                const duplicate = seenIds.has(pm.id);
                seenIds.add(pm.id);
                return !duplicate;
            });
        });

        saveData();
        renderCurrentMonthData();
        renderPaymentMethodList(); // Mantém a lista atualizada dentro do modal
        populateSelects(); // Atualiza selects dos modais
        // Resetar o formulário de forma de pagamento para permitir nova adição
        resetForm('paymentMethodModal');
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
        // A lógica do 'input' agora também re-avalia o isVoucher e a visibilidade
        const isVoucherDetected = e.target.value.toLowerCase().includes('vale') || e.target.value.toLowerCase().includes('ticket');
        if (isVoucherDetected) {
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
            case 'installments': modalId = 'installmentModal'; break;
            case 'category': modalId = 'categoryModal'; break;
            case 'paymentMethod': modalId = 'paymentMethodModal'; break;
            default: return;
        }
        // Para o novo modal de salário, o type é 'incomeInput' (usado no openModalButton)
        // Então, ajustamos aqui para direcionar para o modal correto se o tipo for o salário
        if (type === 'incomeInput') {
             openModal('incomeInputModal', id, type);
        } else {
            openModal(modalId, id, type);
        }
    };

    window.deleteItem = (id, type) => {
        console.log(`Tentando excluir: ID=${id}, Tipo=${type}.`);
        showConfirmModal(`Tem certeza que deseja excluir este item de ${type}?`, (confirmed) => {
            if (confirmed) {
                console.log(`Confirmação recebida: SIM. Excluindo item ${id} do tipo ${type}.`);
                let canDelete = true;
                if (type === 'category') {
                    const isCategoryInUse = Object.values(allMonthsData).some(monthData => {
                        return monthData.fixedExpenses.some(exp => exp.categoryId === id) ||
                               monthData.monthlyExpenses.some(exp => exp.categoryId === id) ||
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
                        console.log(`Exclindo parcela mestre (ID: ${id}) de todos os meses.`);
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
                    else { // Para fixedExpenses, monthlyExpenses, income (agora só salary)
                        const currentMonthData = getCurrentMonthData();
                        // Para income, só permite 'salary' ser zerado, não excluído
                        if (type === 'income' && id === 'salary') {
                            let salaryItem = currentMonthData.income.find(i => i.id === 'salary');
                            if (salaryItem) {
                                salaryItem.value = 0;
                                alert("Salário mensal zerado. Para excluí-lo completamente, use a função de Limpar Dados Transacionais.");
                            }
                        } else {
                             // Para outros itens que podem ser excluídos (se income tivesse outros)
                            currentMonthData[type] = currentMonthData[type].filter(item => item.id !== id);
                        }
                    }
                    saveData();
                    renderCurrentMonthData();
                    if (type === 'category') renderCategoryList();
                    if (type === 'paymentMethod') renderPaymentMethodList();
                }
            } else {
                console.log("Confirmação recebida: NÃO. Exclusão cancelada.");
            }
        });
    };

    // --- Funções de Migração de Dados ---

    const migrateFixedExpenses = () => {
        console.log("--- DEBUG MIGRATE FIXED EXPENSES START ---");
        const sortedMonths = Object.keys(allMonthsData).sort((a, b) => {
            const [yearA, monthA] = a.split('-').map(Number);
            const [yearB, monthB] = b.split('-').map(Number);
            if (yearA !== yearB) return yearA - yearB;
            return monthA - monthB;
        });

        // Map para armazenar a DEFINIÇÃO MESTRE de cada gasto fixo
        // Esta é a lista global de TODOS os gastos fixos que devem propagar
        // Key: id do gasto fixo, Value: objeto do gasto fixo
        // Re-usamos a variável global masterFixedExpensesDefinitions
        masterFixedExpensesDefinitions.clear(); // Limpa antes de coletar novamente

        // 1. Coletar as DEFINIÇÕES MESTRAS de gastos fixos de TODOS os meses
        // Percorremos todos os meses para garantir que cada gasto fixo único seja capturado
        // com sua última versão (a 'date' que o usuário inputou para a edição/criação mais recente).
        Object.values(allMonthsData).forEach(monthData => {
            monthData.fixedExpenses.forEach(fixedExp => {
                // Não precisa de verificação 'existingMaster' aqui, pois o Map sobrescreve.
                // A última versão de um ID prevalece.
                masterFixedExpensesDefinitions.set(fixedExp.id, {
                    id: fixedExp.id,
                    name: fixedExp.name,
                    paymentMethodId: fixedExp.paymentMethodId,
                    categoryId: fixedExp.categoryId,
                    value: fixedExp.value,
                    date: fixedExp.date // A data que o usuário inputou (YYYY-MM-DD), para extrair o dia
                });
            });
        });
        console.log("Master Fixed Expenses collected (from all months):", Array.from(masterFixedExpensesDefinitions.values()));

        // Se não há gastos fixos para propagar (após coleta de mestres), limpa e sai
        if (masterFixedExpensesDefinitions.size === 0) {
            console.log("No fixed expenses to propagate. Clearing all fixed expenses and exiting migration.");
            Object.keys(allMonthsData).forEach(monthKey => {
                allMonthsData[monthKey].fixedExpenses = [];
            });
            return;
        }

        // 2. Limpar os arrays de fixedExpenses em *todos* os meses antes de repopular
        // Isso é CRUCIAL para evitar duplicatas e garantir que as listas serão reconstruídas corretamente
        Object.keys(allMonthsData).forEach(monthKey => {
            allMonthsData[monthKey].fixedExpenses = [];
        });
        console.log("All fixed expenses lists cleared in all months.");


        // 3. Propagar os gastos fixos mestre para todos os meses
        // Percorre todos os meses e adiciona as instâncias dos gastos fixos mestre
        for (let i = 0; i < sortedMonths.length; i++) {
            const monthKey = sortedMonths[i]; // Mês atual no loop de propagação
            let monthData = allMonthsData[monthKey]; // Objeto de dados para este mês
            
            console.log(`Propagating to month: ${monthKey}`);

            masterFixedExpensesDefinitions.forEach(masterFixedExp => {
                // Constrói a data para este mês (do loop de propagação)
                // Usa o ANO/MÊS do 'monthKey' atual do loop e o DIA da 'date' da definição mestre.
                const [loopYear, loopMonth] = monthKey.split('-').map(Number);
                const dayFromMaster = new Date(masterFixedExp.date + 'T12:00:00').getDate(); // Pega o dia da data salva na master definition

                // Garante que o dia não exceda o último dia do mês para o mês atual do loop
                const lastDayOfLoopMonth = new Date(loopYear, loopMonth, 0).getDate();
                const effectiveDayForLoopMonth = Math.min(dayFromMaster, lastDayOfLoopMonth);

                const newDateForLoopMonthObj = new Date(loopYear, loopMonth - 1, effectiveDayForLoopMonth);
                const formattedDateForLoopMonth = newDateForLoopMonthObj.toISOString().split('T')[0];

                console.log(`  - Adding fixed expense ID ${masterFixedExp.id} to ${monthKey}. Calculated date: ${formattedDateForLoopMonth}`);

                monthData.fixedExpenses.push({
                    id: masterFixedExp.id, // Mantém o ID original
                    name: masterFixedExp.name,
                    date: formattedDateForLoopMonth, // Data ajustada para o mês atual do loop
                    paymentMethodId: masterFixedExp.paymentMethodId,
                    categoryId: masterFixedExp.categoryId,
                    value: masterFixedExp.value
                });
            });
            // Opcional: Ordenar os gastos fixos dentro de cada mês se desejado
            monthData.fixedExpenses.sort((a, b) => new Date(a.date + 'T12:00:00') - new Date(b.date + 'T12:00:00'));
        }
        console.log("--- DEBUG MIGRATE FIXED EXPENSES END ---");
    };

    const migrateInstallments = () => {
        const masterInstallmentDefinitions = new Map();

        // 1. Coleta e Padroniza as Definições Mestras de todas as parcelas
        Object.values(allMonthsData).forEach(monthData => {
            monthData.installments.forEach(inst => {
                const existingMaster = masterInstallmentDefinitions.get(inst.id);
                // Usamos inst.originalDate como a base para 'seriesStartDate' aqui
                if (!existingMaster || new Date(inst.originalDate + 'T12:00:00') < new Date(existingMaster.originalDate + 'T12:00:00')) {
                    masterInstallmentDefinitions.set(inst.id, {
                        id: inst.id,
                        name: inst.name,
                        purchaseDate: inst.purchaseDate, // Preserva a data de compra original
                        originalDate: inst.originalDate, // Este AGORA é o seriesStartDate para a migração
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
            const seriesStartDateObj = new Date(masterInst.originalDate + 'T12:00:00'); // Usa o originalDate (que é o seriesStartDate) com hora
            
            sortedMonthsKeys.forEach(monthKey => {
                const monthDate = new Date(monthKey.split('-')[0], parseInt(monthKey.split('-')[1]) - 1, 1);

                const diffMonths = (monthDate.getFullYear() - seriesStartDateObj.getFullYear()) * 12 +
                                   (monthDate.getMonth() - seriesStartDateObj.getMonth());

                if (diffMonths < 0) {
                     return;
                }

                const currentInstallmentNumber = 1 + diffMonths;

                if (currentInstallmentNumber > masterInst.totalInstallments) {
                    return;
                }

                let newDay = seriesStartDateObj.getDate(); // Pega o dia da seriesStartDate
                const daysInCurrentMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
                if (newDay > daysInCurrentMonth) {
                    newDay = daysInCurrentMonth;
                }
                const newDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), newDay);
                const newDateFormatted = newDate.toISOString().split('T')[0];

                const newInstallmentEntry = {
                    id: masterInst.id,
                    name: masterInst.name,
                    purchaseDate: masterInst.purchaseDate, // Preserva a purchaseDate
                    originalDate: masterInst.originalDate, // Mantém como seriesStartDate
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
            allMonthsData[monthKey].installments.sort((a, b) => new Date(a.currentDate + 'T12:00:00') - new Date(b.currentDate + 'T12:00:00'));
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

                showConfirmModal('Deseja **substituir** os dados existentes pelos dados importados ou **mesclá-los** (adicionar meses novos)?\n\n**"Sim" = Substituir (APAGA OS ATUAIS)**\n**"Não" = Mesclar (MANTÉM ATUAIS E ADICIONA NOVOS MESES)**', (response) => { // response pode ser true/false
                    if (response === 'local') { // Se for 'Sim' do genericConfirmModal
                        allMonthsData = importedData;
                        currentMonthKey = Object.keys(allMonthsData).sort()[0];
                        alert('Dados substituídos com sucesso!');
                    } else if (response === 'global') { // Se for 'Não' do genericConfirmModal
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
        // NOVO: Chamada para migrateFixedExpenses() aqui na inicialização
        migrateFixedExpenses(); 
        migrateInstallments();
        updateMonthSelect();
        renderCurrentMonthData();

        document.querySelector('.tab-button[data-tab="summary"]').click();
    };

    initializeApp();
});
