import React, { useState, useEffect } from 'react';
import { LineChart, XAxis, YAxis, Tooltip, Legend, Line, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Define types
interface MonthlyData {
  name: string;
  currentTotal: number;
  heatPumpTotal: number;
  savings: number;
}

interface Savings {
  heating: number;
  cooling: number;
  total: number;
}

// Default energy rates for Nova Scotia
const DEFAULT_RATES = {
  electricity: 0.15, // $/kWh
  oil: 1.20, // $/liter
  gas: 1.50, // $/cubic meter
};

// HVAC system efficiency data
const SYSTEM_EFFICIENCY = {
  heating: {
    'Oil Furnace': 0.80, // 80% efficiency
    'Electric Baseboards': 1.0, // 100% efficiency
    'Gas Furnace': 0.85, // 85% efficiency
  },
  cooling: {
    'Central AC': { base: 10 }, // Base SEER rating
    'Window AC': { base: 8 }, // Base SEER rating
    'No Cooling': { base: 0 }, // No existing cooling
  },
  heatPump: {
    heating: 3.5, // COP (Coefficient of Performance) for cold climate heat pump
    cooling: 18, // SEER rating for cooling
  }
};

// Energy consumption estimates by home size (BTU per sq ft)
const ENERGY_CONSUMPTION = {
  heating: 40, // BTU per sq ft for heating
  cooling: 20, // BTU per sq ft for cooling
};

// Season duration in hours
const SEASON_HOURS = {
  heating: 1200, // Approximate hours of heating per year
  cooling: 800, // Approximate hours of cooling per year
};

// Theme colors
const THEME = {
  primary: 'rgb(63, 185, 236)', // Vibrant blue accent color
  dark: {
    background: '#121212', // Very dark background
    surface: '#1e1e1e', // Slightly lighter surface
    card: '#252525', // Card background
    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
      muted: '#999999',
    }
  }
};

type HeatingSystem = 'Oil Furnace' | 'Electric Baseboards' | 'Gas Furnace';
type CoolingSystem = 'Central AC' | 'Window AC' | 'No Cooling';

const EnergyCalculator: React.FC = () => {
  // State for user inputs
  const [homeSize, setHomeSize] = useState<number>(1500);
  const [heatingSystem, setHeatingSystem] = useState<HeatingSystem>('Oil Furnace');
  const [coolingSystem, setCoolingSystem] = useState<CoolingSystem>('Central AC');
  const [electricityRate, setElectricityRate] = useState<number>(DEFAULT_RATES.electricity);
  const [oilRate, setOilRate] = useState<number>(DEFAULT_RATES.oil);
  const [gasRate, setGasRate] = useState<number>(DEFAULT_RATES.gas);
  const [currentSEER, setCurrentSEER] = useState<number>(10);
  const [useManualInput, setUseManualInput] = useState<boolean>(false);
  const [manualHeatingCost, setManualHeatingCost] = useState<string>('0');
  const [manualCoolingCost, setManualCoolingCost] = useState<string>('0');

  // State for calculated values
  const [currentHeatingCost, setCurrentHeatingCost] = useState<number>(0);
  const [currentCoolingCost, setCurrentCoolingCost] = useState<number>(0);
  const [heatPumpHeatingCost, setHeatPumpHeatingCost] = useState<number>(0);
  const [heatPumpCoolingCost, setHeatPumpCoolingCost] = useState<number>(0);
  const [monthlySavings, setMonthlySavings] = useState<Savings>({ heating: 0, cooling: 0, total: 0 });
  const [annualSavings, setAnnualSavings] = useState<Savings>({ heating: 0, cooling: 0, total: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  // Calculate energy costs when inputs change
  useEffect(() => {
    if (useManualInput) {
      // Use manually entered costs
      const currentHeating = parseFloat(manualHeatingCost) || 0;
      const currentCooling = parseFloat(manualCoolingCost) || 0;

      // Calculate heat pump costs based on a typical reduction percentage
      const heatPumpHeating = currentHeating * (1 / SYSTEM_EFFICIENCY.heatPump.heating);
      const heatPumpCooling = coolingSystem !== 'No Cooling' ?
        currentCooling * (currentSEER / SYSTEM_EFFICIENCY.heatPump.cooling) : 0;

      updateCosts(currentHeating, currentCooling, heatPumpHeating, heatPumpCooling);
    } else {
      // Calculate based on home size and system efficiencies
      let heatingCost = 0;

      // Calculate heating costs
      const heatingBTU = homeSize * ENERGY_CONSUMPTION.heating;

      if (heatingSystem === 'Oil Furnace') {
        // Convert BTU to liters of oil (1 liter ≈ 36,000 BTU with 80% efficiency)
        const oilLiters = (heatingBTU * SEASON_HOURS.heating) / (36000 * SYSTEM_EFFICIENCY.heating[heatingSystem]);
        heatingCost = oilLiters * oilRate;
      } else if (heatingSystem === 'Electric Baseboards') {
        // Convert BTU to kWh (1 kWh ≈ 3412 BTU with 100% efficiency)
        const kWh = (heatingBTU * SEASON_HOURS.heating) / (3412 * SYSTEM_EFFICIENCY.heating[heatingSystem]);
        heatingCost = kWh * electricityRate;
      } else if (heatingSystem === 'Gas Furnace') {
        // Convert BTU to cubic meters of gas (1 cubic meter ≈ 35,300 BTU with 85% efficiency)
        const gasVolume = (heatingBTU * SEASON_HOURS.heating) / (35300 * SYSTEM_EFFICIENCY.heating[heatingSystem]);
        heatingCost = gasVolume * gasRate;
      }

      // Calculate cooling costs
      let coolingCost = 0;
      if (coolingSystem !== 'No Cooling') {
        const coolingBTU = homeSize * ENERGY_CONSUMPTION.cooling;
        const kWh = (coolingBTU * SEASON_HOURS.cooling) / (3412 * (currentSEER / 10)); // Adjusting for SEER
        coolingCost = kWh * electricityRate;
      }

      // Calculate heat pump costs
      // Heat pump heating: using COP (Coefficient of Performance) for efficiency
      const heatPumpHeatingKWh = (homeSize * ENERGY_CONSUMPTION.heating * SEASON_HOURS.heating) /
        (3412 * SYSTEM_EFFICIENCY.heatPump.heating);
      const heatPumpHeatingCost = heatPumpHeatingKWh * electricityRate;

      // Heat pump cooling: using SEER rating for efficiency
      let heatPumpCoolingCost = 0;
      if (coolingSystem !== 'No Cooling') {
        const heatPumpCoolingKWh = (homeSize * ENERGY_CONSUMPTION.cooling * SEASON_HOURS.cooling) /
          (3412 * (SYSTEM_EFFICIENCY.heatPump.cooling / 10));
        heatPumpCoolingCost = heatPumpCoolingKWh * electricityRate;
      }

      updateCosts(heatingCost, coolingCost, heatPumpHeatingCost, heatPumpCoolingCost);
    }
  }, [
    homeSize, heatingSystem, coolingSystem, electricityRate,
    oilRate, gasRate, currentSEER, useManualInput,
    manualHeatingCost, manualCoolingCost
  ]);

  // Helper function to update all cost states
  const updateCosts = (currentHeating: number, currentCooling: number, heatPumpHeating: number, heatPumpCooling: number): void => {
    // Annual costs
    setCurrentHeatingCost(currentHeating);
    setCurrentCoolingCost(currentCooling);
    setHeatPumpHeatingCost(heatPumpHeating);
    setHeatPumpCoolingCost(heatPumpCooling);

    // Calculate savings
    const heatingSavings = currentHeating - heatPumpHeating;
    const coolingSavings = currentCooling - heatPumpCooling;
    const totalSavings = heatingSavings + coolingSavings;

    // Set monthly and annual savings
    setMonthlySavings({
      heating: heatingSavings / 12,
      cooling: coolingSavings / 12,
      total: totalSavings / 12
    });

    setAnnualSavings({
      heating: heatingSavings,
      cooling: coolingSavings,
      total: totalSavings
    });

    // Generate monthly data for charts
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Heating is higher in winter, cooling is higher in summer
    const heatingDistribution = [0.18, 0.16, 0.12, 0.08, 0.04, 0.01, 0.01, 0.01, 0.03, 0.07, 0.12, 0.17];
    const coolingDistribution = [0.01, 0.01, 0.02, 0.05, 0.10, 0.18, 0.22, 0.20, 0.12, 0.06, 0.02, 0.01];

    const data: MonthlyData[] = months.map((month, i) => {
      const currentMonthHeating = currentHeating * heatingDistribution[i];
      const currentMonthCooling = currentCooling * coolingDistribution[i];
      const heatPumpMonthHeating = heatPumpHeating * heatingDistribution[i];
      const heatPumpMonthCooling = heatPumpCooling * coolingDistribution[i];

      return {
        name: month,
        currentTotal: currentMonthHeating + currentMonthCooling,
        heatPumpTotal: heatPumpMonthHeating + heatPumpMonthCooling,
        savings: (currentMonthHeating + currentMonthCooling) - (heatPumpMonthHeating + heatPumpMonthCooling)
      };
    });

    setMonthlyData(data);
  };

  // Format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Formatter function for Recharts tooltips
  const currencyFormatter = (value: number): [string, string] => {
    return [`$${Math.round(value)}`, ''];
  };

  const currencyFormatterWithLabel = (value: number): [string, string] => {
    return [`$${Math.round(value)}`, 'Savings'];
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 rounded-lg shadow-xl text-white">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">HVAC Energy Savings Calculator</h1>
        <div className="w-24 h-1 mx-auto" style={{ backgroundColor: THEME.primary }}></div>
        <p className="text-gray-300 mt-3">Estimate your potential savings with a high-efficiency cold climate heat pump</p>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4" style={{ color: THEME.primary }}>Home Details</h2>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Home Size (sq. ft.)</label>
            <input
              type="range"
              min="500"
              max="4000"
              step="100"
              value={homeSize}
              onChange={(e) => setHomeSize(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">500</span>
              <span className="text-sm font-medium text-white">{homeSize} sq. ft.</span>
              <span className="text-sm text-gray-400">4000</span>
            </div>
          </div>

          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="manualInput"
              checked={useManualInput}
              onChange={() => setUseManualInput(!useManualInput)}
              className="mr-2 accent-blue-500"
            />
            <label htmlFor="manualInput" className="text-gray-300">
              Use manual cost input instead
            </label>
          </div>

          {useManualInput ? (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Annual Heating Cost ($)</label>
                <input
                  type="number"
                  value={manualHeatingCost}
                  onChange={(e) => setManualHeatingCost(e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 text-white"
                  placeholder="Enter your annual heating cost"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Annual Cooling Cost ($)</label>
                <input
                  type="number"
                  value={manualCoolingCost}
                  onChange={(e) => setManualCoolingCost(e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 text-white"
                  placeholder="Enter your annual cooling cost"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Current Heating System</label>
                <select
                  value={heatingSystem}
                  onChange={(e) => setHeatingSystem(e.target.value as HeatingSystem)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 text-white"
                >
                  <option value="Oil Furnace">Oil Furnace</option>
                  <option value="Electric Baseboards">Electric Baseboards</option>
                  <option value="Gas Furnace">Gas Furnace</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Current Cooling System</label>
                <select
                  value={coolingSystem}
                  onChange={(e) => setCoolingSystem(e.target.value as CoolingSystem)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 text-white"
                >
                  <option value="Central AC">Central AC</option>
                  <option value="Window AC">Window AC</option>
                  <option value="No Cooling">No Cooling</option>
                </select>
              </div>

              {coolingSystem !== 'No Cooling' && (
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">Current AC SEER Rating</label>
                  <input
                    type="range"
                    min="8"
                    max="16"
                    step="0.5"
                    value={currentSEER}
                    onChange={(e) => setCurrentSEER(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">8</span>
                    <span className="text-sm font-medium text-white">{currentSEER} SEER</span>
                    <span className="text-sm text-gray-400">16</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4" style={{ color: THEME.primary }}>Energy Rates</h2>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Electricity Rate ($/kWh)</label>
            <input
              type="number"
              step="0.01"
              value={electricityRate}
              onChange={(e) => setElectricityRate(parseFloat(e.target.value))}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 text-white"
              placeholder="Nova Scotia electricity rate"
            />
          </div>

          {heatingSystem === 'Oil Furnace' && (
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Oil Rate ($/liter)</label>
              <input
                type="number"
                step="0.01"
                value={oilRate}
                onChange={(e) => setOilRate(parseFloat(e.target.value))}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 text-white"
                placeholder="Current oil rate"
              />
            </div>
          )}

          {heatingSystem === 'Gas Furnace' && (
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Gas Rate ($/cubic meter)</label>
              <input
                type="number"
                step="0.01"
                value={gasRate}
                onChange={(e) => setGasRate(parseFloat(e.target.value))}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 text-white"
                placeholder="Current gas rate"
              />
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2" style={{ color: THEME.primary }}>Heat Pump Information</h3>
            <div className="bg-gray-700 p-3 rounded-md border-l-4" style={{ borderColor: THEME.primary }}>
              <p className="text-gray-300 mb-2">
                <span className="font-semibold">System:</span> High-Efficiency Cold Climate Heat Pump
              </p>
              <p className="text-gray-300 mb-2">
                <span className="font-semibold">SEER Rating:</span> {SYSTEM_EFFICIENCY.heatPump.cooling} (Cooling)
              </p>
              <p className="text-gray-300">
                <span className="font-semibold">COP:</span> {SYSTEM_EFFICIENCY.heatPump.heating} (Heating)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
        <h2 className="text-2xl font-bold mb-4 text-center" style={{ color: THEME.primary }}>Your Potential Savings</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-2" style={{ color: THEME.primary }}>Current Annual Costs</h3>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Heating:</span>
                <span className="font-medium text-white">{formatCurrency(currentHeatingCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Cooling:</span>
                <span className="font-medium text-white">{formatCurrency(currentCoolingCost)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-600 pt-2">
                <span className="text-gray-300 font-semibold">Total:</span>
                <span className="font-semibold text-white">{formatCurrency(currentHeatingCost + currentCoolingCost)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-2" style={{ color: THEME.primary }}>Heat Pump Annual Costs</h3>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Heating:</span>
                <span className="font-medium text-white">{formatCurrency(heatPumpHeatingCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Cooling:</span>
                <span className="font-medium text-white">{formatCurrency(heatPumpCoolingCost)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-600 pt-2">
                <span className="text-gray-300 font-semibold">Total:</span>
                <span className="font-semibold text-white">{formatCurrency(heatPumpHeatingCost + heatPumpCoolingCost)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg shadow-sm" style={{ backgroundColor: 'rgba(63, 185, 236, 0.15)' }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: THEME.primary }}>Annual Savings</h3>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Heating:</span>
                <span className="font-medium" style={{ color: THEME.primary }}>{formatCurrency(annualSavings.heating)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Cooling:</span>
                <span className="font-medium" style={{ color: THEME.primary }}>{formatCurrency(annualSavings.cooling)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-600 pt-2">
                <span className="text-gray-300 font-semibold">Total:</span>
                <span className="font-semibold" style={{ color: THEME.primary }}>{formatCurrency(annualSavings.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-semibold mb-4 text-center" style={{ color: THEME.primary }}>Monthly Energy Costs</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <XAxis dataKey="name" stroke="#cccccc" />
                <YAxis stroke="#cccccc" />
                <Tooltip 
                  formatter={currencyFormatter}
                  contentStyle={{ backgroundColor: '#252525', border: 'none' }}
                  labelStyle={{ color: THEME.primary }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="currentTotal" 
                  name="Current System" 
                  stroke="#ff4500" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="heatPumpTotal" 
                  name="Heat Pump" 
                  stroke="#3fb9ec" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4 text-center" style={{ color: THEME.primary }}>Monthly Savings</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="name" stroke="#cccccc" />
                <YAxis stroke="#cccccc" />
                <Tooltip 
                  formatter={currencyFormatterWithLabel}
                  contentStyle={{ backgroundColor: '#252525', border: 'none' }}
                  labelStyle={{ color: THEME.primary }}
                />
                <Legend />
                <Bar 
                  dataKey="savings" 
                  name="Monthly Savings" 
                  fill={THEME.primary} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnergyCalculator;
